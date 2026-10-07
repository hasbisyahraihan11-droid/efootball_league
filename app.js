// ===============================
// SUPABASE
// ===============================

const SUPABASE_URL =
  "https://jrhgxphgvahlrodjtjzs.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_SuCUxQSZRQGr_GsS1TCy5Q_ItEUJB4d";


const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


// ===============================
// NAVIGASI
// ===============================

function showPage(pageName) {

  const pages = document.querySelectorAll(".page");

  pages.forEach(page => {
    page.classList.remove("active");
  });

  const selectedPage = document.getElementById(pageName);

  if (selectedPage) {
    selectedPage.classList.add("active");
  }

  if (pageName === "matches") {
    loadMatches();
  }

  if (pageName === "ranking") {
    loadRanking();
  }

}


// ===============================
// LOAD MATCHES
// ===============================

async function loadMatches() {

  const matchList = document.getElementById("matchList");

  matchList.innerHTML = "<p>Memuat...</p>";

  const { data, error } = await supabaseClient
    .from("matches")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {

    matchList.innerHTML =
      "<p>Gagal mengambil data pertandingan.</p>";

    console.error(error);

    return;
  }


  if (!data || data.length === 0) {

    matchList.innerHTML =
      "<p>Belum ada pertandingan.</p>";

    return;
  }


  matchList.innerHTML = data.map(match => `

    <div class="match">

      <div class="teams">
        ${escapeHTML(match.team1)}
        <br>
        <span>vs</span>
        <br>
        ${escapeHTML(match.team2)}
      </div>

      <div class="score">
        ${match.score1} - ${match.score2}
      </div>

      <div class="status">
        ${escapeHTML(match.status)}
      </div>

    </div>

  `).join("");

}


// ===============================
// TAMBAH MATCH
// ===============================

async function addMatch() {

  const team1 =
    document.getElementById("team1").value.trim();

  const score1 =
    parseInt(document.getElementById("score1").value);

  const score2 =
    parseInt(document.getElementById("score2").value);

  const team2 =
    document.getElementById("team2").value.trim();

  const message =
    document.getElementById("message");


  if (
    !team1 ||
    !team2 ||
    Number.isNaN(score1) ||
    Number.isNaN(score2)
  ) {

    message.textContent =
      "Lengkapi semua data.";

    return;
  }


  const { error } = await supabaseClient
    .from("matches")
    .insert({

      team1: team1,
      score1: score1,
      score2: score2,
      team2: team2,
      status: "FT"

    });


  if (error) {

    console.error(error);

    message.textContent =
      "Gagal menambahkan pertandingan.";

    return;
  }


  message.textContent =
    "✅ Pertandingan berhasil ditambahkan!";


  document.getElementById("team1").value = "";
  document.getElementById("score1").value = "";
  document.getElementById("score2").value = "";
  document.getElementById("team2").value = "";


  loadMatches();
  loadRanking();

}


// ===============================
// RANKING
// ===============================

async function loadRanking() {

  const rankingList =
    document.getElementById("rankingList");

  rankingList.innerHTML =
    "<p>Memuat ranking...</p>";


  const { data, error } = await supabaseClient
    .from("matches")
    .select("*");


  if (error) {

    rankingList.innerHTML =
      "<p>Gagal mengambil ranking.</p>";

    console.error(error);

    return;
  }


  const ranking = {};


  data.forEach(match => {

    if (!ranking[match.team1]) {

      ranking[match.team1] = 0;

    }

    if (!ranking[match.team2]) {

      ranking[match.team2] = 0;

    }


    if (match.score1 > match.score2) {

      ranking[match.team1] += 3;

    }

    else if (match.score2 > match.score1) {

      ranking[match.team2] += 3;

    }

    else {

      ranking[match.team1] += 1;
      ranking[match.team2] += 1;

    }

  });


  const sorted =
    Object.entries(ranking)
      .sort((a, b) => b[1] - a[1]);


  if (sorted.length === 0) {

    rankingList.innerHTML =
      "<p>Belum ada ranking.</p>";

    return;
  }


  rankingList.innerHTML =
    sorted.map((team, index) => `

      <div class="rank">

        <div class="rank-name">
          #${index + 1}
          &nbsp;
          ${escapeHTML(team[0])}
        </div>

        <div class="rank-points">
          ${team[1]} PTS
        </div>

      </div>

    `).join("");

}


// ===============================
// KEAMANAN TEKS
// ===============================

function escapeHTML(text) {

  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// ===============================
// REALTIME
// ===============================

supabaseClient
  .channel("matches-realtime")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "matches"
    },
    () => {

      loadMatches();
      loadRanking();

    }
  )
  .subscribe();


// ===============================
// AWAL
// ===============================

loadMatches();
loadRanking();
