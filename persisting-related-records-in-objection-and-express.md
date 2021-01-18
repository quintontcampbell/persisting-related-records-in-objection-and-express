In this article we'll discover how to persist one-to-many related records in an Express/React monolith app. We will review the state of the application provided, determine the most appropriate routing when working with a record that has a `belongsToOne` relationship, and explore how best to insert a new record with Objection so that our applications can better handle user input.

### Learning Goals

* Construct a POST fetch request that has the necessary information to persist record that belongs to another record
* Understand the nuances of nested routes in an Express application
* Create the necessary Objection queries to persist related records

### Getting Started

```no-highlight
et get persisting-related-records-in-objection-and-express
cd persisting-related-records-in-objection-and-express
createdb persisting-related-records-in-objection-and-express_development
yarn install

cd server
yarn migrate:latest
yarn db:seed

cd ..
yarn run dev
```

For this assignment, some of the files and code have already been created for you. Navigating to <http://localhost:3000> should show you the text "My Movie Genres" on the page, with two genres listed.

Navigate to `"/genres"`, `"/genres/1"` and `"/movies"`  to familiarize yourself with the current application. These routes render a list of genres, details for a genre including related movies, and a list of movies respectively. Ensure that you familiarize yourself with each of the components in the `client/src/components` folder to get a sense of the frontend UI.

In addition, make sure to examine the provided Knex migration files in order to familiarize yourself with the database.

### The App Thus Far

The theme and much of the code for this application is similar to the genres-and-movies app in [One to Many Associations in Express and React][One to Many Associations in Express and React]. In the current application, we can review lists of genres and movies, and also visit show pages for genres to explore their details and related movies. The relationship is as follows:

![Image of the one-to-many relationship between genres and movies][Image of the one-to-many relationship between genres and movies]

The latest feature that we will want to explore is persisting a new movie record that happens to belong to an existing genre. We sometimes call the child "movie" entity in this situation a **nested resource**. A nested resource's CRUD functionality is partially reliant on its parent, associated entity. For instance, in order to create a movie, we must also determine what genre that movie belongs to, especially given that our movie record requires a foreign key of `genreId` in order to be created. Therefore, **if we wish to create a nested resource such as a movie, the POST request that creates that movie must come with a parameter including that `genreId`.**

### Setting Up Our POST Request

The aim is to create a movie tied to a related and pre-existing genre. This will make more sense in practice, so let's examine the POST fetch request that is made when adding a new movie in our React code. Currently, the `MovieForm` component handles the user input for adding a new movie. When the form is submitted, the `postMovie` function is called (defined in the parent `GenreShowPage` component).

```js
// client/src/components/GenreShowPage.js

const postMovie = async (newMovieData) => {
  try {
    const response = await fetch(`/api/v1/genres/${genreId}/movies`, {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify(newMovieData)
    })
    if (!response.ok) {
        if(response.status === 422) {
          const body = await response.json()
          const newErrors = translateServerErrors(body.errors)
          return setErrors(newErrors)
        } else {
          const errorMessage = `${response.status} (${response.statusText})`
          const error = new Error(errorMessage)
          throw(error)
        }
      } else {
        const body = await response.json()
        const updatedMovies = genre.movies.concat(body.movie)
        setGenre({...genre, movies: updatedMovies})
      }
  } catch(error) {
    console.error(`Error in fetch: ${error.message}`)
  }
}
```

It turns out that having our `postMovie` function defined in `GenreShowPage` is convenient, because it gives us access to the `id` of the genre that we are currently looking at (via `props` courtesy of React Router). We save this id to the `genreId` variable higher up in our component. Then, when we make our fetch request in the `postMovie` function, the `genreId` is readily available. This is the `genreId` foreign key that our nested movie resource needs in order to be created!

Notice that the URL path for this fetch POST request makes mention of the associated genre. The `/movies` sub-path is nested after `/genres/${genreId}`, because our POST request needs to contain the associated `genreId` allowing us to properly persist our new movie record on the backend.

### Handling Nested Routes

At this point we have a fetch request that passes along the information we need, but our backend needs adjustments in order to handle the nesting of `/movies` under our "/genres" routes; only then can we persist our new movie record. Based on the URL of `/api/v1/genres/${genre.id}/movies`, our app thinks that `genresRouter` will handle requests, because according to our `rootRouter` file, all requests that begin with `/api/v1/genres` should be delegated to the `genresRouter`.

```js
// server/src/routes/rootRouter.js
//...
import genresRouter from "./api/v1/genresRouter"
import moviesRouter from "./api/v1/moviesRouter"

rootRouter.use("/api/v1/genres", genresRouter)
rootRouter.use("/api/v1/movies", moviesRouter)
rootRouter.use("/", clientRouter)
//...
```

However, the related CRUD action of this request is specifically for movies (specifically creating a new movie), which means ideally the endpoint is defined under a `moviesRouter`.

But now we run into an issue: we don't want to nest our entire `moviesRouter` under our `genresRouter` paths! We currently have an API endpoint, "/api/v1/movies", which is unnested and which we want to keep active. We never want to `use()` the same router twice in different places, as it will duplicate routes (we'd end up with both an "/api/v1/movies" AND an "/api/v1/genres/:id/movies" path). So we need a third router for those movie-related routes which are nested under our genres. To this end, we will create a `genreMoviesRouter`!

The first thing we will do is mount our new router in our `genresRouter`, in order to nest any routes underneath the "/genres/:id" path. We can do that as so:

```js
// server/src/routes/api/v1/genresRouter.js
//...
import genreMoviesRouter from "./genreMoviesRouter.js"

const genresRouter = new express.Router()

//...
genresRouter.use("/:genreId/movies", genreMoviesRouter)
//...
```

Just like we do in our `rootRouter`, we're using the `use()` method to add any routes within our `genreMoviesRouter` at a _namespaced_ path of "/genres/:genreId/movies.

Now, we can create a new `server/src/routes/api/v1/genreMoviesRouter.js` file with the POST route inside it:

```js
// server/src/routes/api/v1/genreMoviesRouter.js

import express from "express"
import objection from "objection"
const { ValidationError } = objection

import Movie from "../../../models/Movie.js"
import cleanUserInput from "../../../services/cleanUserInput.js"

const genreMoviesRouter = new express.Router({ mergeParams: true })

genreMoviesRouter.post("/", async (req, res) => {
  const { body } = req
  const formInput = cleanUserInput(body)
  const { title, year } = formInput
  const { genreId } = req.params

  try {
    const newMovie = await Movie.query().insertAndFetch({ title, year, genreId })
    return res.status(201).json({ movie: newMovie })
  } catch (error) {
    console.log(error)
    if (error instanceof ValidationError) {
        return res.status(422).json({ errors: error.data })
      }
    return res.status(500).json({ errors: error })
  }
})

export default genreMoviesRouter
```

The first thing we will notice here is that we are passing an _option_ into our `new express.Router()` call, of `{ mergeParams: true }`. The `mergeParams` option preserves any parameters that were passed to the parent router. We usually don't need it (and it defaults to `false`), but it's incredibly helpful with nested routers! With this option turned on, the `genreId` that is initially provided only to the `genresRouter` is passed along to our `moviesRouter` routes. It will be called `genreId` thanks to the way we mounted our `genreMoviesRouter` within our `genresRouter`: `genresRouter.use("/:genreId/movies", genreMoviesRouter)`.

Now that we know we'll have access to that parent id, our POST route is fairly straightforward. We access the `title` and `year` of the new movie via the request body, and then access the `genreId` via the URL path as a `param`. Once we have those pieces of data, we can use our `Movie` model to insert the movie and handle for errors as normal. Our React frontend can handle for errors the same way it was with simple POST requests.

Go ahead and head to <http://locahost:3000/genres/1> and add a new movie in the provided form. We will see that movie load to our page successfully. Huzzah!

### Bonus: Chaining `insert` Queries

Note that you can also chain Objection's `insert` queries on a `$relatedQuery`. An example of this can be found in the `Seed.js` file used for adding initial records to your database.

```js
/// server/src/db/Seed.js
class Seeder {
  static async seed() {
    console.log("seeding...")
    const comedy = await Genre.query().insert({name: "Comedy"})
    const drama = await Genre.query().insert({name: "Drama"})

    await comedy.$relatedQuery('movies').insert({ title: 'Isle of Dogs', year: 2018 })
    await comedy.$relatedQuery('movies').insert({ title: 'What We Do in the Shadows', year: 2014 })

    await drama.$relatedQuery('movies').insert({ title: 'Short Term 12', year: 2013 })
    await drama.$relatedQuery('movies').insert({ title: '50/50', year: 2011 })


    console.log("Done!")
    await connection.destroy()
  }
}

export default Seeder
```

This is kind of magical! It allows us to skip the tep of having to hand in a `genreId`, and instead we can just chain our movie insert right on to our `genre` object. From there, it figures out which foreign key to insert for us. In other words:

```js
const comedy = await Genre.query().findById(1)
await comedy.$relatedQuery('movies').insert({ title: 'Booksmart', year: 2019 })
```

The above code is able to execute and know that it needs to insert a `Movie` (thanks to `$relatedQuery('movies')`) that adds a `genreId` of `1` (thanks to calling the query on `comedy`):

```
Movie {
  title: 'Booksmart',
  year: '2019',
  genreId: '1'
}
```

### Why This Matters

While learning how to develop web applications, the scope of the app is often small but, as our application grows, relationships between entities like genres & movies, recipes & ingredients, authors & books, etc. begin to form. We will want to query for related data, and additionally, we will want to persist related data. Using nested routes is one way we can neatly and efficiently set up our forms and API requests to associate records, specifically with one-to-many relationships. If we can set up our routes to correctly handle the queries we need to make for related records, then our application can continue to scale with more complex relationships between our records.

### In Summary

Having nested routes in an application can sometimes feel like a tongue twister for your brain, especially when persisting related records. As always, creating an ER diagram can help us determine how the tables in our database can relate to one another through foreign keys. Once we know the data and foreign keys needed, we can ensure that our frontend React code provides that data in the fetch request (with privileged access to the parent record's id if our form is on the parent's show page). Finally, while the query for inserting a nested resource is largely standard, in order to handle the appropriate routing, we need to distinguish between nested and un-nested routes, and mount them in the appropriate places.

[Image of the one-to-many relationship between genres and movies]: https://s3.amazonaws.com/horizon-production/images/OneManyRelations.png
[One to Many Associations in Express and React]: https://learn.launchacademy.com/lessons/one-to-many-associations-in-express-and-objection
