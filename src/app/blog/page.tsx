
"use client"

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Post, Category } from '@/lib/data';
import { User as UserData } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ArrowRight, Calendar, User as UserIcon, Loader2, Search, CalendarIcon, Filter } from 'lucide-react';
import { format, subDays, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { getSupabaseClient_client } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';


function PostCard({ post, author }: { post: Post, author?: UserData }) {
  const getAuthorName = () => {
    if (!author) return "Unknown Author";
    const authorName = author.name || "Unknown Author";
     if (authorName.length > 15) {
        return `${authorName.substring(0, 15)}...`;
    }
    return authorName;
  };
  
  const imageUrl = post.featured_image_url || "https://placehold.co/1200x600.png";

  return (
    <Card className="overflow-hidden group">
      <CardHeader className="p-0">
        <Link href={`/blog/${post.slug}`} className="block relative h-60 w-full">
          <Image
            src={imageUrl}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            data-ai-hint={post.featured_image_hint}
          />
        </Link>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            <span className="truncate">{getAuthorName()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(post.published_at), 'PPP')}</span>
          </div>
        </div>
        <h2 className="text-2xl font-headline font-bold mb-3">
          <Link href={`/blog/${post.slug}`} className="hover:text-primary transition-colors">
            {post.title}
          </Link>
        </h2>
        <p className="text-muted-foreground line-clamp-3 mb-4">
          {post.content}
        </p>
        <Link href={`/blog/${post.slug}`} className="font-semibold text-primary inline-flex items-center gap-1">
          Read More <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}

export default function BlogPage() {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAuthor, setSelectedAuthor] = useState('all');
  const [selectedRange, setSelectedRange] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const isMobile = useIsMobile();
  
  useEffect(() => {
    if (!isMobile) {
      setIsFilterOpen(true);
    }
  }, [isMobile]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const supabase = getSupabaseClient_client();
      try {
        const postsPromise = supabase.from('posts').select('*').order('published_at', { ascending: false });
        const usersPromise = supabase.from('users').select('*');
        const categoriesPromise = supabase.from('categories').select('*');

        const [postsRes, usersRes, categoriesRes] = await Promise.all([postsPromise, usersPromise, categoriesPromise]);

        if(postsRes.error) throw postsRes.error;
        setAllPosts(postsRes.data as Post[]);

        if(usersRes.error) throw usersRes.error;
        setAllUsers(usersRes.data as UserData[]);

        if(categoriesRes.error) throw categoriesRes.error;
        setAllCategories(categoriesRes.data as Category[]);

      } catch (error) {
        console.error("Error fetching blog data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredAndSortedPosts = useMemo(() => {
    let filtered = allPosts.filter(post => {
      const postDate = new Date(post.published_at);
      const matchesSearch = searchTerm.trim() === '' || post.title.toLowerCase().includes(searchTerm.toLowerCase()) || post.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || post.category_id === selectedCategory;
      const matchesAuthor = selectedAuthor === 'all' || post.author_id === selectedAuthor;
      
      let matchesRange = true;
      if (selectedRange !== 'all' && selectedRange !== 'custom') {
        let daysToSubtract = 0;
        if(selectedRange === 'week') daysToSubtract = 7;
        if(selectedRange === 'month') daysToSubtract = 30;
        if(selectedRange === 'year') daysToSubtract = 365;
        const cutoffDate = subDays(new Date(), daysToSubtract);
        matchesRange = isAfter(postDate, cutoffDate);
      } else if (selectedRange === 'custom') {
         matchesRange = 
            (!startDate || isAfter(postDate, startOfDay(startDate))) &&
            (!endDate || isBefore(postDate, endOfDay(endDate)));
      }

      return matchesSearch && matchesCategory && matchesAuthor && matchesRange;
    });

    switch (sortBy) {
        case 'newest':
            filtered.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
            break;
        case 'oldest':
            filtered.sort((a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime());
            break;
        case 'title-asc':
            filtered.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'title-desc':
            filtered.sort((a, b) => b.title.localeCompare(a.title));
            break;
    }
    
    return filtered;
  }, [allPosts, searchTerm, selectedCategory, selectedAuthor, selectedRange, sortBy, startDate, endDate]);

  const findAuthor = (authorId?: string) => allUsers.find(user => user.id === authorId);

  return (
    <div className="container mx-auto px-4 py-12">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-headline font-bold">Our Blog</h1>
        <p className="text-lg text-muted-foreground mt-2">Travel stories, tips, and insights from our team.</p>
      </header>

      <aside className="mb-12">
        <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen} className="p-4 md:p-6 bg-secondary rounded-lg shadow-sm">
            <CollapsibleTrigger asChild>
                <button className="flex md:hidden w-full items-center justify-between">
                    <h3 className="text-lg font-semibold">Filter & Sort</h3>
                    <Filter className="h-5 w-5" />
                </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="mt-4 md:mt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
                    <div className="sm:col-span-2 lg:col-span-4 xl:col-span-1">
                        <label className="block text-sm font-medium mb-2">Search Posts</label>
                        <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                                type="text"
                                placeholder="e.g., Paris, Tips..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Category</label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {allCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Author</label>
                        <Select value={selectedAuthor} onValueChange={setSelectedAuthor}>
                            <SelectTrigger><SelectValue placeholder="All Authors" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Authors</SelectItem>
                                {allUsers.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Filter by Date</label>
                        <Select value={selectedRange} onValueChange={setSelectedRange}>
                            <SelectTrigger><SelectValue placeholder="All Time" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="week">Last 7 Days</SelectItem>
                                <SelectItem value="month">Last 30 Days</SelectItem>
                                <SelectItem value="year">Last Year</SelectItem>
                                <SelectItem value="custom">Custom Range</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Sort By</label>
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger><SelectValue placeholder="Sort..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">Newest First</SelectItem>
                                <SelectItem value="oldest">Oldest First</SelectItem>
                                <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                                <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                {selectedRange === 'custom' && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Start Date</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {startDate ? format(startDate, 'PPP') : <span>Pick a start date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <CalendarPicker mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">End Date</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {endDate ? format(endDate, 'PPP') : <span>Pick an end date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <CalendarPicker mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible>
      </aside>
      
      <main>
        {loading ? (
           <div className="text-center py-16">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Loading posts...</p>
          </div>
        ) : filteredAndSortedPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredAndSortedPosts.map(post => (
              <PostCard key={post.id} post={post} author={findAuthor(post.author_id)} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <h2 className="text-2xl font-headline font-semibold">No Posts Found</h2>
            <p className="text-muted-foreground mt-2">Try adjusting your filters or check back later.</p>
          </div>
        )}
      </main>
    </div>
  );
}
