
"use client";

import { useState, useRef } from "react";
import type { Package } from "@/lib/data";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Star, Clock, MapPin, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import BookingForm from "@/components/BookingForm";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { getEmbedUrl } from "@/lib/utils";
import Autoplay from "embla-carousel-autoplay";

type Props = {
  pkg: Package;
};

export default function PackageDetailClient({ pkg }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const embedUrl = pkg.video_url ? getEmbedUrl(pkg.video_url) : null;
  const plugin = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );
  
  const allImages = [
    { url: pkg.image_url, hint: pkg.image_hint || '' },
    ...(pkg.gallery_images || [])
  ];

  return (
    <div className="bg-background">
      <section className="relative h-64 md:h-96 bg-black">
        {allImages.length > 1 ? (
          <Carousel
            className="w-full h-full"
            plugins={[plugin.current]}
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
          >
            <CarouselContent>
              {allImages.map((image, index) => (
                <CarouselItem key={index} className="relative w-full h-64 md:h-96">
                   <Image
                    src={image.url}
                    alt={`${pkg.title} gallery image ${index + 1}`}
                    fill
                    className="object-cover brightness-75 cursor-grab active:cursor-grabbing"
                    data-ai-hint={image.hint}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="absolute left-4 z-10" />
            <CarouselNext className="absolute right-4 z-10" />
          </Carousel>
        ) : (
          <Image
            src={pkg.image_url}
            alt={pkg.title}
            fill
            className="object-cover brightness-75"
            data-ai-hint={pkg.image_hint}
          />
        )}
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent">
          <div className="container mx-auto px-4 py-8 text-white">
            <Badge variant="secondary" className="mb-2">{pkg.type}</Badge>
            <h1 className="text-4xl md:text-6xl font-headline font-bold">{pkg.title}</h1>
            <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                    <MapPin className="h-5 w-5" /> {pkg.destination}
                </div>
                <div className="flex items-center gap-1">
                    <Clock className="h-5 w-5" /> {pkg.duration} Days
                </div>
                <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 text-yellow-400" /> {pkg.rating}
                </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          <div className="lg:col-span-2">
            <h2 className="text-3xl font-headline font-semibold mb-4">Tour Overview</h2>
            <p className="text-muted-foreground leading-relaxed">{pkg.description}</p>
            
            <h2 className="text-3xl font-headline font-semibold mt-12 mb-4">Itinerary</h2>
            <Accordion type="single" collapsible className="w-full">
              {pkg.itinerary && pkg.itinerary.map((item, index) => (
                <AccordionItem value={`item-${index}`} key={`itinerary-${pkg.id}-${index}`}>
                  <AccordionTrigger className="text-lg font-semibold font-headline">
                    Day {item.day}: {item.title}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.details}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            
            {embedUrl && (
                <div className="mt-12">
                  <h2 className="text-3xl font-headline font-semibold mb-4">Tour Video</h2>
                  <div className="aspect-video w-full rounded-lg overflow-hidden shadow-lg">
                    <iframe
                        className="w-full h-full"
                        src={embedUrl}
                        title="Package Video"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                  </div>
                </div>
            )}
          </div>

          <aside className="lg:col-span-1">
            <div className="sticky top-24">
                <div className="border rounded-lg p-6 shadow-lg bg-card">
                    <div className="text-center mb-6">
                        <span className="text-sm text-muted-foreground">Starting from</span>
                        <p className="text-4xl font-bold text-primary">৳{pkg.price.toLocaleString()}</p>
                        <span className="text-sm text-muted-foreground">per person</span>
                    </div>

                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full text-lg" size="lg">
                          Book Now
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle className="font-headline">Book: {pkg.title}</DialogTitle>
                          <DialogDescription>
                            Fill out the form below and we'll get back to you shortly to confirm your booking.
                          </DialogDescription>
                        </DialogHeader>
                        <BookingForm packageId={pkg.id} packageName={pkg.title} setDialogOpen={setDialogOpen} />
                      </DialogContent>
                    </Dialog>

                    <div className="mt-8 space-y-4">
                       <h3 className="text-xl font-headline font-semibold text-center">Package Details</h3>
                       <div className="grid grid-cols-1 gap-6 mt-4">
                          {pkg.inclusions && pkg.inclusions.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2">Inclusions</h4>
                              <ul className="space-y-2">
                                {pkg.inclusions.map((item, index) => (
                                  <li key={index} className="flex items-start gap-2 text-sm">
                                    <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                                    <span className="text-muted-foreground">{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {pkg.exclusions && pkg.exclusions.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2">Exclusions</h4>
                              <ul className="space-y-2">
                                {pkg.exclusions.map((item, index) => (
                                  <li key={index} className="flex items-start gap-2 text-sm">
                                    <X className="h-4 w-4 mt-0.5 text-red-500 flex-shrink-0" />
                                    <span className="text-muted-foreground">{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                       </div>
                    </div>
                </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
