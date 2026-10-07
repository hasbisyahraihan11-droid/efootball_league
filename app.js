// ==========================================
// SUPABASE
// ==========================================

const SUPABASE_URL =
  "https://jrhgxphgvahlrodjtjzs.supabase.co/rest/v1/";

const SUPABASE_ANON_KEY =
  "sb_publishable_SuCUxQSZRQGr_GsS1TCy5Q_ItEUJB4d";


const supabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );


// ==========================================
// LOAD MATCH
// ==========================================

async function loadMatches() {

  const { data, error } =
    await supabaseClient
      .from("matches")
      .select("*")
      .order(
        "created_at",
        {
          ascending: false
        }
      )
      .limit(20);


  if (error) {

    console.log(error);

    document.getElementById(
      "matches"
    ).innerHTML =
      "<div class='loading'>Gagal mengambil data.</div>";

    return;
  }


  tampilkanMatch(data);

  hitungRanking(data);
}


// ==========================================
// TAMPILKAN MATCH
// ==========================================

function tampilkanMatch(data) {

  const box =
    document.getElementById(
      "matches"
    );


  if (!data || data.length === 0) {

    box.innerHTML =
      "<div class='loading'>Belum ada pertandingan.</div>";

    return;
  }


  box.innerHTML =
    data.map(match => `

      <div class="match">

        <div class="team">

          ${match.team1}

          <small>
            ${match.status}
          </small>

        </div>


        <div class="score-result">

          ${match.score1}
          -
          ${match.score2}

        </div>


        <div class="team">

          ${match.team2}

          <small>
            eFootball
          </small>

        </div>

      </div>

    `).join("");
}


// ==========================================
// TAMBAH MATCH
// ==========================================

async function addMatch() {

  const team1 =
    document.getElementById(
      "team1"
    ).value.trim();


  const team2 =
    document.getElementById(
      "team2"
    ).value.trim();


  const score1 =
    Number(
      document.getElementById(
        "score1"
      ).value
    );


  const score2 =
    Number(
      document.getElementById(
        "score2"
      ).value
    );


  if (!team1 || !team2) {

    document.getElementById(
      "message"
    ).innerText =
      "Nama tim wajib diisi.";

    return;
  }


  const { error } =
    await supabaseClient
      .from("matches")
      .insert({

        team1: team1,

        score1: score1,

        score2: score2,

        team2: team2,

        status: "FT"

      });


  if (error) {

    console.log(error);

    document.getElementById(
      "message"
    ).innerText =
      "Gagal menyimpan.";

    return;
  }


  document.getElementById(
    "message"
  ).innerText =
    "✅ Hasil berhasil ditambahkan!";


  document.getElementById(
    "team1"
  ).value = "";


  document.getElementById(
    "team2"
  ).value = "";


  document.getElementById(
    "score1"
  ).value = 0;


  document.getElementById(
    "score2"
  ).value = 0;


  loadMatches();
}


// ==========================================
// RANKING OTOMATIS
// ==========================================

function hitungRanking(matches) {

  const points = {};


  matches.forEach(match => {

    const team1 =
      match.team1;

    const team2 =
      match.team2;


    if (!points[team1])
      points[team1] = 0;


    if (!points[team2])
      points[team2] = 0;


    if (
      Number(match.score1) >
      Number(match.score2)
    ) {

      points[team1] += 3;

    }

    else if (
      Number(match.score1) <
      Number(match.score2)
    ) {

      points[team2] += 3;

    }

    else {

      points[team1] += 1;

      points[team2] += 1;

    }

  });


  const ranking =
    Object.entries(points)
      .sort(
        (a,b) => b[1] - a[1]
      );


  const box =
    document.getElementById(
      "ranking"
    );


  box.innerHTML =
    ranking
      .slice(0,6)
      .map(
        (team,index) => `

        <div class="rank">

          <small>
            #${index + 1}
          </small>

          <b>
            ${team[0]}
          </b>

          <strong>
            ${team[1]} PTS
          </strong>

        </div>

        `
      )
      .join("");
}


// ==========================================
// REALTIME
// ==========================================

supabaseClient
  .channel("live-matches")

  .on(
    "postgres_changes",

    {
      event: "*",

      schema: "public",

      table: "matches"
    },

    function() {

      console.log(
        "MATCH UPDATE!"
      );

      loadMatches();

    }

  )

  .subscribe();


// ==========================================
// START
// ==========================================

loadMatches();
