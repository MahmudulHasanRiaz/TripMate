import { getSupabaseClient_server } from "@/lib/supabase";
import SetupForm from "@/components/setup/SetupForm";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

async function checkSchemaExists(): Promise<boolean> {
    try {
        const supabase = getSupabaseClient_server();
        // We try to query a table that must exist for the setup to be considered possible.
        // If this query fails for any reason (table not found, connection error),
        // we can assume the schema is not ready.
        const { data, error } = await supabase.from('site_status').select('id').limit(1);

        // If there's an error, it means the table likely doesn't exist or there's a connection issue.
        if (error) {
            return false;
        }

        // If there's no error, the query was successful, meaning the table exists.
        return true;

    } catch (e) {
        // Catch any other catastrophic errors during client initialization or query.
        return false;
    }
}


export default async function SetupPage() {

    const schemaExists = await checkSchemaExists();

    if (!schemaExists) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-secondary">
                <Card className="w-full max-w-md shadow-2xl text-center">
                    <CardHeader className="space-y-1">
                        <div className="flex justify-center mb-4">
                            <AlertTriangle className="h-12 w-12 text-destructive" />
                        </div>
                        <CardTitle className="text-2xl font-headline">
                            Database Schema Missing
                        </CardTitle>
                        <CardDescription>
                            A connection to the database was successful, but the required tables were not found.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Please run the initial database migration script to create the necessary tables before proceeding with the setup.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return <SetupForm />;
}
