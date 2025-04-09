import { Button } from "@/components/ui/button";
import { MenuItemWithCategory } from "@shared/schema";
import { Edit, Trash2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type MenuItemRowProps = {
  menuItem: MenuItemWithCategory;
  onEdit: (menuItem: MenuItemWithCategory) => void;
};

export function MenuItemRow({ menuItem, onEdit }: MenuItemRowProps) {
  const { toast } = useToast();
  
  // Delete menu item mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/menu-items/${menuItem.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      toast({
        title: "Menu item deleted",
        description: `${menuItem.name} has been deleted successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete menu item",
        description: error.message || "There was an error deleting the menu item.",
        variant: "destructive",
      });
    },
  });
  
  // Handle delete
  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${menuItem.name}?`)) {
      deleteMutation.mutate();
    }
  };
  
  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="h-10 w-10 flex-shrink-0">
            <img className="h-10 w-10 rounded-full object-cover" src={menuItem.image} alt={menuItem.name} />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{menuItem.name}</div>
            <div className="text-sm text-gray-500 truncate max-w-xs">{menuItem.description}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{menuItem.category.name}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{menuItem.price.toString()}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div className="flex items-center">
          <span className="text-yellow-500 mr-1">{Number(menuItem.rating).toFixed(1)}</span>
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-xs text-gray-500 ml-1">({menuItem.reviewCount})</span>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            menuItem.isAvailable
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {menuItem.isAvailable ? "Available" : "Out of Stock"}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <Button
          variant="ghost"
          size="sm"
          className="text-primary hover:text-primary/80 mr-3"
          onClick={() => onEdit(menuItem)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:text-red-800"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}
