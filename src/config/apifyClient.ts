import { ApifyClient } from 'apify-client';
import 'dotenv/config'
export const apifyClient = new ApifyClient({
  token:process.env.APIFY_TOKEN!,
});
