// Firebase Auth and Firestore both need a browser, and every page here is
// behind a sign-in, so there is nothing worth rendering on the server. Running
// as a single-page app keeps auth state in one place instead of splitting it
// across a server pass and a client pass.
export const ssr = false;
export const prerender = false;
