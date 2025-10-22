import { getSupabaseClient_server } from "@/lib/supabase";
import SetupForm from "@/components/setup/SetupForm";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

async function checkSchemaExists() {
    try {
        const supabase = getSupabaseClient_server();
        // We try to query a table that should exist after migration.
        // We don't care about the data, only if the query succeeds or fails.
        const { error } = await supabase.from('site_status').select('id').limit(1);

        // If we get a specific error code for 'relation does not exist', schema is not there.
        if (error && error.code === '42P01') {
            return false;
        }
        
        // For any other error or success, we assume schema might exist or there's another issue.
        // The form submission will handle other potential issues.
        return true;

    } catch (e) {
        // If the entire connection fails, we'll also consider schema as non-existent for simplicity.
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
