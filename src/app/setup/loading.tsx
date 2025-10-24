
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function SetupLoading() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-secondary">
            <Card className="w-full max-w-md shadow-2xl text-center">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-headline">
                        Verifying Setup...
                    </CardTitle>
                    <CardDescription>
                        Please wait while we check your application's status.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center items-center py-8">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
