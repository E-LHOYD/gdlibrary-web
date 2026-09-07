# GD-Library on the web

The browser version of the digital library. It is the same library as the
Android app: the same Firebase project, the same `books`, `users`,
`readingProgress` and `shelves` collections, and the same admin dashboard
behind it. A book opened here shows the same progress in the app, and a shelf
made here is the same shelf there.

## What it does

| Screen | Route | Notes |
| --- | --- | --- |
| Welcome | `/` | Sends a signed-in visitor straight to the library |
| Sign in | `/login` | Includes the forgot-password email |
| Register | `/register` | Student (senior high / college) or teacher, three interests |
| Library | `/library` | Every book, ordered by how well it fits the reader |
| Browse all | `/browse` | The plain list, with search |
| Subjects | `/subjects`, `/subjects/[subject]` | Grouped by the dashboard's subject list |
| Search | `/search?q=` | Title or author, every term must match |
| Book | `/books/[id]` | Cover, details, shelves, and where reading starts |
| Reader | `/read/[id]` | pdf.js, saving progress as you scroll |
| My shelf | `/shelf` | Reading history, Read, Viewed and up to five of your own |
| A shelf | `/shelf/[shelfId]` | Sortable by title, author, progress, published date, last opened |
| For you | `/recommendations` | Year level filters, interests rank |
| Profile | `/profile` | Details, reading counts, editable interests, password reset |

## How the code is laid out

`src/lib/services/` holds the logic ported straight across from the app's
`app/services/`: `subjects.js`, `yearLevels.js`, `sortBooks.js`, `users.js`,
`mappings.js` and `recommendations.js` are the same rules, so a change to how
recommendations work can be made in one place and copied to the other rather
than reinvented. The only difference is the Firebase call style: the app uses
the NativeScript plugin's namespaced API, the web uses the modular SDK.

`order.js` is web-only. `recommendBooks` filters as well as ranks, which is
right for the For-you page and wrong for the library, where every book should
still be reachable. `rankOrRecommend` scores the whole library and puts what
the filter would have dropped underneath instead of removing it.

## Running it

    npm install
    cp .env.example .env.local     # then fill in the six Firebase values
    npm run dev

`npm run build` produces the Vercel build. The same six `VITE_FIREBASE_*`
variables have to be set in the Vercel project settings for the deployed site.

Everything renders in the browser (`ssr = false` in `src/routes/+layout.js`):
the pages read Firestore as the signed-in user, so there is nothing for a
server to render before that user exists.
