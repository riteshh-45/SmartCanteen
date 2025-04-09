import { Info } from "lucide-react";
import { NutritionalInfo as NutritionalInfoType } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type NutritionalInfoProps = {
  nutritionalInfo: NutritionalInfoType | null;
  allergens: string[] | null;
};

export function NutritionalInfo({ nutritionalInfo, allergens }: NutritionalInfoProps) {
  if (!nutritionalInfo && (!allergens || allergens.length === 0)) {
    return null;
  }

  // Calculate daily value percentages
  const dailyValues = nutritionalInfo
    ? {
        calories: Math.round((nutritionalInfo.calories / 2000) * 100),
        protein: Math.round((nutritionalInfo.protein / 50) * 100),
        carbs: Math.round((nutritionalInfo.carbs / 275) * 100),
        fat: Math.round((nutritionalInfo.fat / 78) * 100),
        fiber: Math.round((nutritionalInfo.fiber / 28) * 100),
        sugar: Math.round((nutritionalInfo.sugar / 50) * 100),
        sodium: Math.round((nutritionalInfo.sodium / 2300) * 100),
      }
    : null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Info className="h-4 w-4" />
          <span>Nutrition & Allergens</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nutritional Information</DialogTitle>
          <DialogDescription>
            Detailed nutritional values and allergen information.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {nutritionalInfo && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Nutrition Facts</h4>
              <div className="space-y-2">
                {/* Calories */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Calories</span>
                    <span className="text-sm font-medium">{nutritionalInfo.calories} kcal</span>
                  </div>
                  <Progress value={dailyValues?.calories} className="h-2" />
                  <div className="flex justify-end">
                    <span className="text-xs text-muted-foreground">{dailyValues?.calories}% Daily Value*</span>
                  </div>
                </div>

                {/* Protein */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Protein</span>
                    <span className="text-sm font-medium">{nutritionalInfo.protein}g</span>
                  </div>
                  <Progress value={dailyValues?.protein} className="h-2" />
                  <div className="flex justify-end">
                    <span className="text-xs text-muted-foreground">{dailyValues?.protein}% Daily Value*</span>
                  </div>
                </div>

                {/* Carbs */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Carbohydrates</span>
                    <span className="text-sm font-medium">{nutritionalInfo.carbs}g</span>
                  </div>
                  <Progress value={dailyValues?.carbs} className="h-2" />
                  <div className="flex justify-end">
                    <span className="text-xs text-muted-foreground">{dailyValues?.carbs}% Daily Value*</span>
                  </div>
                </div>

                {/* Fat */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Fat</span>
                    <span className="text-sm font-medium">{nutritionalInfo.fat}g</span>
                  </div>
                  <Progress value={dailyValues?.fat} className="h-2" />
                  <div className="flex justify-end">
                    <span className="text-xs text-muted-foreground">{dailyValues?.fat}% Daily Value*</span>
                  </div>
                </div>

                {/* Fiber */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Dietary Fiber</span>
                    <span className="text-sm font-medium">{nutritionalInfo.fiber}g</span>
                  </div>
                  <Progress value={dailyValues?.fiber} className="h-2" />
                  <div className="flex justify-end">
                    <span className="text-xs text-muted-foreground">{dailyValues?.fiber}% Daily Value*</span>
                  </div>
                </div>

                {/* Sugar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Sugars</span>
                    <span className="text-sm font-medium">{nutritionalInfo.sugar}g</span>
                  </div>
                  <Progress value={dailyValues?.sugar} className="h-2" />
                  <div className="flex justify-end">
                    <span className="text-xs text-muted-foreground">{dailyValues?.sugar}% Daily Value*</span>
                  </div>
                </div>

                {/* Sodium */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Sodium</span>
                    <span className="text-sm font-medium">{nutritionalInfo.sodium}mg</span>
                  </div>
                  <Progress value={dailyValues?.sodium} className="h-2" />
                  <div className="flex justify-end">
                    <span className="text-xs text-muted-foreground">{dailyValues?.sodium}% Daily Value*</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                *Percent Daily Values are based on a 2,000 calorie diet.
              </p>
            </div>
          )}

          {allergens && allergens.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Allergens</h4>
              <div className="flex flex-wrap gap-2">
                {allergens.map((allergen) => (
                  <span
                    key={allergen}
                    className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-red-700 border-red-200 bg-red-50"
                  >
                    {allergen}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Please inform our staff about any other allergies you may have.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}