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