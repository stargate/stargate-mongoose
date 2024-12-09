/**
 * Create an Astra connection URI while connecting to Astra Data API
 * @param apiEndpoint the database API Endpoint of the Astra database
 * @param apiToken an Astra application token
 * @param namespace the namespace to connect to
 * @param baseApiPath baseAPI path defaults to /api/json/v1
 * @param authHeaderName
 * @returns URL as string
 */
export default function createAstraUri(apiEndpoint: string, apiToken: string, namespace?: string, baseApiPath?: string, authHeaderName?: string): string;
