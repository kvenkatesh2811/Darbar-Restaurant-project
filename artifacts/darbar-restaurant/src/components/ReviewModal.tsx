import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateReview, getListReviewsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Star } from "lucide-react";

const formSchema = z.object({
  customerName: z.string().min(2, { message: "Name must be at least 2 characters." }),
  rating: z.number().min(1).max(5),
  comment: z.string().min(10, { message: "Review must be at least 10 characters." }),
});

export function ReviewModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const createReview = useCreateReview();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      rating: 5,
      comment: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createReview.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast({
            title: "Review submitted!",
            description: "Thank you for your feedback. It will be visible once approved.",
          });
          queryClient.invalidateQueries({ queryKey: getListReviewsQueryKey() });
          setIsOpen(false);
          form.reset();
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Something went wrong.",
            description: "Please try again later.",
          });
        },
      }
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="font-medium" data-testid="button-leave-review">
          Leave a Review
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Share Your Experience</DialogTitle>
          <DialogDescription>
            We'd love to hear about your meal at Darbar.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" {...field} data-testid="input-review-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rating</FormLabel>
                  <FormControl>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => field.onChange(star)}
                          className={`p-1 transition-colors ${
                            star <= field.value ? "text-yellow-400" : "text-muted hover:text-yellow-200"
                          }`}
                          data-testid={`button-review-star-${star}`}
                        >
                          <Star className="h-6 w-6 fill-current" />
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Review</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="What did you think of the food and service?" 
                      className="min-h-[100px]" 
                      {...field} 
                      data-testid="textarea-review-comment"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full mt-6" disabled={createReview.isPending} data-testid="button-submit-review">
              {createReview.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
