import React, { useState } from "react"

import ErrorList from "./ErrorList"

const MovieForm = ({ postMovie, errors }) => {
  const [newMovie, setNewMovie] = useState({
    title: "",
    year: "",
  })

  const handleInputChange = event => {
    setNewMovie({
      ...newMovie,
      [event.currentTarget.name]: event.currentTarget.value
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    postMovie(newMovie)
    clearForm()
  }

  const clearForm = () => {
    setNewMovie({
      title: "",
      year: ""
    })
  }

  return (
    <div className="callout">
      <h1>New Movie Form</h1>
      <form onSubmit={handleSubmit} >
        <ErrorList errors={errors} />
        <label>
          Title:
          <input
            type="text"
            name="title"
            onChange={handleInputChange}
            value={newMovie.title}
          />
        </label>

        <label>
          Release Year:
          <input
            type="text"
            name="year"
            onChange={handleInputChange}
            value={newMovie.year}
          />
        </label>

        <div className="button-group">
          <input className="button" type="submit" value="Submit" />
        </div>
      </form>
    </div>
  )
}

export default MovieForm;
