import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // Handle demo accounts with pre-hashed passwords (bcrypt style)
  if (stored.startsWith("$2b$")) {
    // For demo logins, we'll allow these plaintext combinations
    const demoCredentials: Record<string, string> = {
      "student123": "$2b$10$7Gq0QU2RITBtLPzmJOrcquEWfdsMo1kW0BoKXsd1SRcTUsrMAFU7O",
      "admin123": "$2b$10$y.PtQiXa6jw6srVR9sMUxeXpvJQCEd2y1MBthjMl7b4YzE3RM3gFm",
      "kitchen123": "$2b$10$7x67FRaXhUu1yFIrwhqg2O4zxhMehCMcvLfgAsyNO9c7e9bvDkPT2"
    };
    
    return demoCredentials[supplied] === stored;
  }
  
  // Regular scrypt password comparison for non-demo accounts
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "smart-canteen-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate input
      const { username, password, name, email, role = "student" } = req.body;
      
      if (!username || !password || !name || !email) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Create new user with hashed password
      const user = await storage.createUser({
        username,
        password: await hashPassword(password),
        name,
        email,
        role
      });

      // Remove password from response
      const userWithoutPassword = { ...user };
      delete userWithoutPassword.password;

      // Log in the user
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error, user: SelectUser) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });
      
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        
        // Remove password from response
        const userWithoutPassword = { ...user };
        delete userWithoutPassword.password;
        
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Remove password from response
    const userWithoutPassword = { ...req.user };
    delete userWithoutPassword.password;
    
    res.json(userWithoutPassword);
  });

  // Update user profile
  app.patch("/api/user/profile", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { name, email } = req.body;
      
      // Validate input
      if (!name && !email) {
        return res.status(400).json({ message: "At least one field (name or email) is required" });
      }
      
      // Update user
      const updatedUser = await storage.updateUser(req.user.id, {
        name: name || req.user.name,
        email: email || req.user.email
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const userWithoutPassword = { ...updatedUser };
      delete userWithoutPassword.password;
      
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });
}
