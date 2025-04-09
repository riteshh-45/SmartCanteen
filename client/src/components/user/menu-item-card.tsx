import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/use-cart";
import { MenuItemWithCategory, NutritionalInfo as NutritionalInfoType } from "@shared/schema";
import { Star, StarHalf, ShoppingCart, Clock, AlertCircle, Heart } from "lucide-react";
import { NutritionalInfo } from "./nutritional-info";
import { motion } from "framer-motion";
import { useState } from "react";

type MenuItemCardProps = {
  menuItem: MenuItemWithCategory;
};

export function MenuItemCard({ menuItem }: MenuItemCardProps) {
  const { addToCart } = useCart();
  const [liked, setLiked] = useState(false);
  
  // Generate star icons based on rating
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`star-${i}`} className="h-4 w-4 fill-current text-yellow-400" />);
    }
    
    // Half star
    if (hasHalfStar) {
      stars.push(<StarHalf key="half-star" className="h-4 w-4 fill-current text-yellow-400" />);
    }
    
    // Empty stars
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-star-${i}`} className="h-4 w-4 text-yellow-400" />);
    }
    
    return stars;
  };
  
  const handleAddToCart = () => {
    addToCart(menuItem);
  };
  
  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300, damping: 15 }}
    >
      <Card className="h-full overflow-hidden flex flex-col shadow-md hover:shadow-lg transition-all duration-300 bg-white border border-orange-100 rounded-xl">
        <div className="relative h-48 overflow-hidden rounded-t-xl">
          <img 
            src={menuItem.image} 
            alt={menuItem.name} 
            className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
          />
          {menuItem.isSurplus && (
            <Badge className="absolute top-3 right-3 bg-orange-600 text-white font-medium px-3 py-1.5 rounded-full text-xs shadow-sm">30% OFF</Badge>
          )}
          <Badge className="absolute top-3 left-3 bg-orange-500/90 text-white font-medium backdrop-blur-sm px-3 rounded-full shadow-sm">{menuItem.category.name}</Badge>
          
          <motion.button 
            className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-white/90 shadow-sm flex items-center justify-center"
            whileTap={{ scale: 0.9 }}
            onClick={() => setLiked(!liked)}
          >
            <Heart className={`h-4 w-4 ${liked ? 'text-red-500 fill-red-500' : 'text-gray-500'}`} />
          </motion.button>
        </div>
        <CardContent className="flex-grow flex flex-col p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-base font-semibold text-gray-900">{menuItem.name}</h3>
            <span className="text-orange-600 font-bold text-lg">₹{menuItem.price.toString()}</span>
          </div>
          <p className="text-gray-600 text-xs mb-3 flex-grow line-clamp-2">{menuItem.description}</p>
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              {renderStars(Number(menuItem.rating))}
              <span className="text-xs text-gray-500 ml-1">({menuItem.reviewCount})</span>
            </div>
            {(menuItem.nutritionalInfo || menuItem.allergens) && (
              <NutritionalInfo 
                nutritionalInfo={menuItem.nutritionalInfo as NutritionalInfoType | null} 
                allergens={menuItem.allergens} 
              />
            )}
          </div>
          
          {!menuItem.isAvailable ? (
            <Button 
              variant="outline"
              className="w-full bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed rounded-full"
              disabled
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Out of Stock
            </Button>
          ) : (
            <motion.div
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                onClick={handleAddToCart}
                className="w-full gap-2 font-medium shadow-sm transition-all hover:shadow-md text-white rounded-full bg-orange-500 hover:bg-orange-600"
              >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
