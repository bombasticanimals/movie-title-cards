import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./App.css";

function App() {
  const [movies, setMovies] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [showAddMovie, setShowAddMovie] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const [user, setUser] = useState(null);

  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [titleCard, setTitleCard] = useState(null);

  const [editingMovie, setEditingMovie] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [adding, setAdding] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const [sortBy, setSortBy] = useState("recent");

  const currentYear = new Date().getFullYear();

  const years = [];

  for (let year = currentYear; year >= 1888; year--) {
    years.push(year);
  }


  /* =========================
     LOAD MOVIES
  ========================= */

  async function loadMovies() {
    setLoading(true);

    const { data, error } = await supabase
      .from("movies")
      .select("*")
      .order("created_at", {
        ascending: false
      });

    if (error) {
      console.error(error);
      alert("Could not load movies.");
    } else {
      setMovies(data || []);
    }

    setLoading(false);
  }


  /* =========================
     CHECK LOGIN
  ========================= */

  useEffect(() => {

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const {
      data: authListener
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };

  }, []);


  useEffect(() => {
    loadMovies();
  }, []);


  /* =========================
     FAVICON
  ========================= */

  useEffect(() => {

    if (
      movies.length > 0 &&
      movies[0].poster_url
    ) {

      let favicon =
        document.querySelector(
          "link[rel='icon']"
        );

      if (!favicon) {
        favicon =
          document.createElement("link");

        favicon.rel = "icon";

        document.head.appendChild(
          favicon
        );
      }

      favicon.href =
        movies[0].poster_url;
    }

  }, [movies]);


  /* =========================
     LOGIN
  ========================= */

  async function login(event) {

    event.preventDefault();

    setLoggingIn(true);

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      alert(
        "Login failed: " +
        error.message
      );
    } else {

      setEmail("");
      setPassword("");

      setShowLogin(false);
    }

    setLoggingIn(false);
  }


  /* =========================
     LOGOUT
  ========================= */

  async function logout() {
    await supabase.auth.signOut();
  }


  /* =========================
     RESET FORM
  ========================= */

  function resetForm() {

    setTitle("");
    setYear("");
    setPosterUrl("");
    setTitleCard(null);
    setEditingMovie(null);

    const fileInput =
      document.getElementById(
        "title-card-upload"
      );

    if (fileInput) {
      fileInput.value = "";
    }
  }


  /* =========================
     ADD MOVIE
  ========================= */

  async function addMovie(event) {

    event.preventDefault();

    if (!user) {
      alert("You must be logged in.");
      return;
    }

    if (!title.trim()) {
      alert("Please enter a movie title.");
      return;
    }

    if (!posterUrl.trim()) {
      alert("Please enter a poster URL.");
      return;
    }

    if (!titleCard) {
      alert(
        "Please upload the title card."
      );
      return;
    }

    setAdding(true);

    try {

      const extension =
        titleCard.name
          .split(".")
          .pop()
          ?.toLowerCase() || "jpg";

      const fileName =
        `${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } =
        await supabase.storage
          .from("movie-images")
          .upload(
            fileName,
            titleCard
          );

      if (uploadError) {
        console.error(uploadError);

        alert(
          "Could not upload title card."
        );

        setAdding(false);
        return;
      }


      const { data: publicUrlData } =
        supabase.storage
          .from("movie-images")
          .getPublicUrl(
            fileName
          );

      const titleCardUrl =
        publicUrlData.publicUrl;


      const { error: movieError } =
        await supabase
          .from("movies")
          .insert([
            {
              title: title.trim(),
              year: year
                ? Number(year)
                : null,
              poster_url:
                posterUrl.trim(),
              image_url:
                titleCardUrl
            }
          ]);


      if (movieError) {
        console.error(movieError);

        alert(
          "Movie could not be added."
        );

        setAdding(false);
        return;
      }


      resetForm();

      setShowAddMovie(false);

      await loadMovies();

    } catch (error) {

      console.error(error);

      alert(
        "Something went wrong."
      );

    }

    setAdding(false);
  }


  /* =========================
     START EDIT
  ========================= */

  function startEdit(movie) {

    setEditingMovie(movie);

    setTitle(movie.title || "");
    setYear(movie.year || "");
    setPosterUrl(
      movie.poster_url || ""
    );

    setTitleCard(null);

    setShowAddMovie(true);
  }


  /* =========================
     UPDATE MOVIE
  ========================= */

  async function updateMovie(event) {

    event.preventDefault();

    if (!user) {
      alert("You must be logged in.");
      return;
    }

    if (!title.trim()) {
      alert("Please enter a movie title.");
      return;
    }

    if (!posterUrl.trim()) {
      alert("Please enter a poster URL.");
      return;
    }

    setAdding(true);

    try {

      let titleCardUrl =
        editingMovie.image_url;


      /*
        If a new title card was selected,
        upload the new one.
      */

      if (titleCard) {

        const extension =
          titleCard.name
            .split(".")
            .pop()
            ?.toLowerCase() || "jpg";

        const fileName =
          `${crypto.randomUUID()}.${extension}`;

        const {
          error: uploadError
        } = await supabase.storage
          .from("movie-images")
          .upload(
            fileName,
            titleCard
          );

        if (uploadError) {

          console.error(
            uploadError
          );

          alert(
            "Could not upload new title card."
          );

          setAdding(false);
          return;
        }


        const {
          data: publicUrlData
        } = supabase.storage
          .from("movie-images")
          .getPublicUrl(
            fileName
          );

        titleCardUrl =
          publicUrlData.publicUrl;
      }


      /*
        Update database record
      */

      const {
        error
      } = await supabase
        .from("movies")
        .update({
          title: title.trim(),

          year: year
            ? Number(year)
            : null,

          poster_url:
            posterUrl.trim(),

          image_url:
            titleCardUrl
        })
        .eq(
          "id",
          editingMovie.id
        );


      if (error) {

        console.error(error);

        alert(
          "Movie could not be updated."
        );

        setAdding(false);
        return;
      }


      resetForm();

      setShowAddMovie(false);

      await loadMovies();

    } catch (error) {

      console.error(error);

      alert(
        "Something went wrong."
      );

    }

    setAdding(false);
  }


  /* =========================
     DELETE MOVIE
  ========================= */

async function deleteMovie(movie) {
  if (!user) {
    alert("You must be logged in.");
    return;
  }

  const confirmed = window.confirm(
    `Delete "${movie.title}"?`
  );

  if (!confirmed) {
    return;
  }

  const { data, error } = await supabase
    .from("movies")
    .delete()
    .eq("id", movie.id)
    .select();

  if (error) {
    console.error("Delete error:", error);

    alert(
      "Movie could not be deleted:\n\n" +
      error.message
    );

    return;
  }

  if (!data || data.length === 0) {
    alert(
      "Nothing was deleted. Supabase did not allow this deletion."
    );

    return;
  }

  // Remove the movie from the screen immediately
  setMovies((currentMovies) =>
    currentMovies.filter(
      (item) => item.id !== movie.id
    )
  );
}

  /* =========================
     SEARCH
  ========================= */

  const searchText =
    search.trim().toLowerCase();

  let displayedMovies =
    movies.filter((movie) =>
      movie.title
        .toLowerCase()
        .includes(searchText)
    );


  /* =========================
     SORT
  ========================= */

  if (sortBy === "name") {

    displayedMovies.sort(
      (a, b) =>
        a.title.localeCompare(
          b.title,
          undefined,
          {
            sensitivity: "base"
          }
        )
    );

  } else if (sortBy === "year") {

    displayedMovies.sort(
      (a, b) =>
        (b.year || 0) -
        (a.year || 0)
    );

  } else {

    displayedMovies.sort(
      (a, b) =>
        new Date(b.created_at) -
        new Date(a.created_at)
    );

  }


  /* =========================
     WEBSITE
  ========================= */

  return (

    <div className="app">

      <header className="header">

        <h1>
          MOVIE TITLE CARDS
        </h1>


        <div className="toolbar">

          <input
            className="search"
            type="text"
            placeholder="Search movie titles..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />


          <select
            className="sort-select"
            value={sortBy}
            onChange={(event) =>
              setSortBy(
                event.target.value
              )
            }
          >

            <option value="recent">
              Recently Added
            </option>

            <option value="name">
              Name
            </option>

            <option value="year">
              Year
            </option>

          </select>


          {user && (

            <button
              className="plus-button"
              onClick={() =>
                setShowAddMovie(true)
              }
            >
              +
            </button>

          )}


          {!user && (

            <button
              className="login-button"
              onClick={() =>
                setShowLogin(true)
              }
            >
              ADMIN
            </button>

          )}


          {user && (

            <button
              className="login-button"
              onClick={logout}
            >
              LOGOUT
            </button>

          )}

        </div>

      </header>


      <main>


        {searchText && (

          <div className="results-count">

            {displayedMovies.length}
            {" "}
            results

          </div>

        )}


        {loading ? (

          <p className="message">
            Loading movies...
          </p>

        ) : displayedMovies.length === 0 ? (

          <p className="message">

            {searchText
              ? "No movies found."
              : "No movies have been added yet."
            }

          </p>

        ) : (

          <div className="movie-grid">

            {displayedMovies.map(
              (movie) => (

                <MovieCard
                  key={movie.id}
                  movie={movie}
                  user={user}
                  onEdit={startEdit}
                  onDelete={deleteMovie}
                />

              )
            )}

          </div>

        )}

      </main>


      {/* =====================
          LOGIN
      ===================== */}

      {showLogin && (

        <div
          className="modal-background"
          onClick={() =>
            setShowLogin(false)
          }
        >

          <div
            className="add-box"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="add-header">

              <h2>
                ADMIN LOGIN
              </h2>

              <button
                className="close-button"
                onClick={() =>
                  setShowLogin(false)
                }
              >
                ×
              </button>

            </div>


            <form onSubmit={login}>

              <label>

                Email

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                />

              </label>


              <label>

                Password

                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                />

              </label>


              <button
                className="submit-button"
                type="submit"
                disabled={loggingIn}
              >
                {loggingIn
                  ? "LOGGING IN..."
                  : "LOGIN"
                }
              </button>

            </form>

          </div>

        </div>

      )}


      {/* =====================
          ADD / EDIT
      ===================== */}

      {showAddMovie && user && (

        <div
          className="modal-background"
          onClick={() => {
            resetForm();
            setShowAddMovie(false);
          }}
        >

          <div
            className="add-box"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="add-header">

              <h2>

                {editingMovie
                  ? "EDIT MOVIE"
                  : "ADD MOVIE"
                }

              </h2>


              <button
                className="close-button"
                onClick={() => {
                  resetForm();
                  setShowAddMovie(false);
                }}
              >
                ×
              </button>

            </div>


            <form
              onSubmit={
                editingMovie
                  ? updateMovie
                  : addMovie
              }
            >


              <label>

                Movie title

                <input
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value
                    )
                  }
                />

              </label>


              <label>

                Year

                <select
                  value={year}
                  onChange={(event) =>
                    setYear(
                      event.target.value
                    )
                  }
                >

                  <option value="">
                    Select year
                  </option>

                  {years.map(
                    (yearOption) => (

                      <option
                        key={yearOption}
                        value={yearOption}
                      >
                        {yearOption}
                      </option>

                    )
                  )}

                </select>

              </label>


              <label>

                Poster URL

                <input
                  type="url"
                  value={posterUrl}
                  onChange={(event) =>
                    setPosterUrl(
                      event.target.value
                    )
                  }
                />

              </label>


              <label>

                {editingMovie
                  ? "Replace title card (optional)"
                  : "Upload title card"
                }

                <input
                  id="title-card-upload"
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setTitleCard(
                      event.target.files[0]
                    )
                  }
                />

              </label>


              {editingMovie &&
                !titleCard && (

                  <p className="selected-file">

                    Current title card
                    will remain unchanged.

                  </p>

                )}


              {titleCard && (

                <p className="selected-file">

                  Selected:
                  {" "}
                  {titleCard.name}

                </p>

              )}


              <button
                className="submit-button"
                type="submit"
                disabled={adding}
              >

                {adding
                  ? "SAVING..."
                  : editingMovie
                    ? "SAVE CHANGES"
                    : "ADD MOVIE"
                }

              </button>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}


/* =========================
   MOVIE CARD
========================= */

function MovieCard({
  movie,
  user,
  onEdit,
  onDelete
}) {

  function openTitleCard() {

    if (movie.image_url) {

      window.open(
        movie.image_url,
        "_blank",
        "noopener,noreferrer"
      );

    }

  }


  return (

    <article className="movie-card">

      <div
        className="movie-poster"
        onClick={openTitleCard}
      >

        {movie.poster_url ? (

          <img
            src={movie.poster_url}
            alt={movie.title}
          />

        ) : (

          <div className="no-poster">
            NO POSTER
          </div>

        )}


        <div className="poster-overlay">

          <span className="hover-title">
            {movie.title}
          </span>

          <span className="hover-year">
            {movie.year}
          </span>

        </div>


        {user && (

          <div className="admin-controls">

            <button
              onClick={(event) => {
                event.stopPropagation();
                onEdit(movie);
              }}
            >
              EDIT
            </button>


            <button
              onClick={(event) => {
                event.stopPropagation();
                onDelete(movie);
              }}
            >
              DELETE
            </button>

          </div>

        )}

      </div>

    </article>

  );
}


export default App;