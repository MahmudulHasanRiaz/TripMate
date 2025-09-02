import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Package } from "@/lib/data";
import { Badge } from "./ui/badge";
import { Star, Clock, MapPin } from "lucide-react";

type PackageCardProps = {
  pkg: Package;
};

export default function PackageCard({ pkg }: PackageCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="p-0 relative">
        <Link href={`/packages/${pkg.slug}`} className="block">
          <Badge className="absolute top-4 right-4 z-10" variant={pkg.type === "Hajj" || pkg.type === "Umrah" ? "default" : "secondary"}>
            {pkg.type}
          </Badge>
          <Image
            src={pkg.image_url}
            alt={pkg.title}
            width={600}
            height={400}
            className="aspect-[3/2] w-full object-cover"
            data-ai-hint={pkg.image_hint}
          />
        </Link>
      </CardHeader>
      <CardContent className="flex-grow p-6">
        <CardTitle className="font-headline text-2xl mb-2">
            <Link href={`/packages/${pkg.slug}`} className="hover:text-primary transition-colors">
                {pkg.title}
            </Link>
        </CardTitle>
        <CardDescription className="flex items-center gap-2 text-muted-foreground mb-4">
          <MapPin className="h-4 w-4" /> {pkg.destination}
        </CardDescription>
        <p className="text-sm line-clamp-3">{pkg.description}</p>
      </CardContent>
      <CardFooter className="flex justify-between items-center p-6 bg-secondary/50">
        <div className="flex flex-col">
           <span className="text-2xl font-bold text-primary">৳{pkg.price.toLocaleString()}</span>
           <span className="text-xs text-muted-foreground">per person</span>
        </div>
        <Button asChild>
          <Link href={`/packages/${pkg.slug}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
