import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export default function AuthLoading() {
  return (
    <Card className="border-border/80 bg-card/80 shadow-xl backdrop-blur-xl animate-pulse">
      <CardHeader className="space-y-2 text-center flex flex-col items-center">
        <Skeleton className="h-7 w-48 rounded-lg" />
        <Skeleton className="h-4 w-64 rounded-md" />
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <Skeleton className="h-10 w-full rounded-md mt-4" />
      </CardContent>
      <CardFooter className="flex justify-center border-t border-border/40 pt-4">
        <Skeleton className="h-4 w-44" />
      </CardFooter>
    </Card>
  );
}
