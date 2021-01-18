import React, { useState, useEffect } from "react"

import MovieTile from "./MovieTile"
import MovieForm from "./MovieForm"
import translateServerErrors from './../services/translateServerErrors.js'

const GenreShowPage = (props) => {
  const [genre, setGenre] = useState({ movies: [] })
  const [errors, setErrors] = useState({})

  const genreId = props.match.params.id

  useEffect(() => {
    const getGenre = async () => {
      try {
        const response = await fetch(`/api/v1/genres/${genreId}`)
        if (!response.ok) {
          const errorMessage = `${response.status} (${response.statusText})`
          const error = new Error(errorMessage);
          throw(error);
        }
        const genreData = await response.json()
        setGenre(genreData.genre)
      } catch(error) {
        console.error(`Error in fetch: ${error.message}`)
      }
    }
    getGenre()
  }, [])

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

  const movieTileComponents = genre.movies.map(movieObject => {
    return(
      <MovieTile
        key={movieObject.id}
        {...movieObject}
      />
    )
  })

  return(
    <div className="callout">
      <h1>{genre.name}</h1>
      <MovieForm
        postMovie={postMovie}
        errors={errors}
      />
      {movieTileComponents}
    </div>
  )
}

export default GenreShowPage
