import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Category } from "@shared/schema";

type CategoryFilterProps = {
  categories: Category[] | undefined;
  selectedCategory: number | null;
  onSelectCategory: (categoryId: number | null) => void;
};

export function CategoryFilter({ categories, selectedCategory, onSelectCategory }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button
        variant={selectedCategory === null ? "default" : "outline"}
        onClick={() => onSelectCategory(null)}
        className="rounded-full"
      >
        All Items
      </Button>
      
      {categories?.map((category) => (
        <Button
          key={category.id}
          variant={selectedCategory === category.id ? "default" : "outline"}
          onClick={() => onSelectCategory(category.id)}
          className="rounded-full"
        >
          {category.name}
        </Button>
      ))}
    </div>
  );
}
