// DELIBERATE SYNTAX ERROR. This file is served with HTTP 200 and a JavaScript
// MIME type, but it cannot parse. Per the "avoid caching module failures" spec
// change (whatwg/html#10327), only NETWORK and STATUS-CODE failures become
// retryable; a fetched module that fails to PARSE still produces a (cached)
// errored module script, so re-importing this URL must NOT refetch it.
export const broken = ;
