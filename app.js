// ==========================================
// SUPABASE
// ==========================================

const SUPABASE_URL =
  "https://jrhgxphgvahlrodjtjzs.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_SuCUxQSZRQGr_GsS1TCy5Q_ItEUJB4d";


const supabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


// ==========================================
// NAVIGASI
// ==========================================

function showPage(pageName, button = null) {

  document.querySelectorAll(".page")
    .forEach(page => {
      page.classList.remove("active");
    });

  const page =
    document.getElementById(pageName);

  if (page) {
    page.classList.add("active");
  }


  document.querySelectorAll(".menu")
    .forEach(btn => {
      btn.classList.remove("active");
    });

  if (button) {
    button.classList.add("active");
  }


  const titles = {
    home: "Dashboard",
    table: "Klasemen",
    matches: "Pertandingan",
    admin: "Admin"
  };

  document.getElementById("pageTitle")
    .textContent =
      titles[pageName] || "Dashboard";


  if (pageName === "table") {
    loadLeagueTable();
  }

  if (pageName === "matches") {
    loadMatches();
  }

  if (pageName === "home") {
    updateStats();
  }
}


// ==========================================
// LOAD SEMUA MATCH
// ==========================================

async function getMatches() {

  const { data, error } =
    await supabaseClient
      .from("matches")
      .select("*")
      .order("created_at", {
        ascending: false
      });


  if (error) {

    console.error(error);

    return [];

  }


  return data || [];
}


// ==========================================
// HITUNG KLASEMEN
// ==========================================

function calculateTable(matches) {

  const teams = {};


  matches.forEach(match => {

    const team1 = match.team1;
    const team2 = match.team2;

    const score1 =
      Number(match.score1);

    const score2 =
      Number(match.score2);


    // Buat team kalau belum ada

    if (!teams[team1]) {

      teams[team1] = {
        name: team1,
        mp: 0,
        w: 0,
        d: 0,
        l: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        pts: 0
      };

    }


    if (!teams[team2]) {

      teams[team2] = {
        name: team2,
        mp: 0,
        w: 0,
        d: 0,
        l: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        pts: 0
      };

    }


    // Main

    teams[team1].mp++;
    teams[team2].mp++;


    // Gol

    teams[team1].gf += score1;
    teams[team1].ga += score2;

    teams[team2].gf += score2;
    teams[team2].ga += score1;


    // Hasil pertandingan

    if (score1 > score2) {

      // Team 1 menang

      teams[team1].w++;
      teams[team2].l++;

      teams[team1].pts += 3;

    }

    else if (score2 > score1) {

      // Team 2 menang

      teams[team2].w++;
      teams[team1].l++;

      teams[team2].pts += 3;

    }

    else {

      // Seri

      teams[team1].d++;
      teams[team2].d++;

      teams[team1].pts++;
      teams[team2].pts++;

    }

  });


  // Hitung GD

  Object.values(teams).forEach(team => {

    team.gd =
      team.gf - team.ga;

  });


  // Urutan seperti Liga Inggris:
  //
  // 1. Poin
  // 2. Selisih gol
  // 3. Gol memasukkan

  return Object.values(teams)
    .sort((a, b) => {

      if (b.pts !== a.pts) {
        return b.pts - a.pts;
      }

      if (b.gd !== a.gd) {
        return b.gd - a.gd;
      }

      return b.gf - a.gf;

    });

}


// ==========================================
// TAMPILKAN KLASEMEN
// ==========================================

async function loadLeagueTable() {

  const tbody =
    document.getElementById("leagueTable");


  tbody.innerHTML = `
    <tr>
      <td colspan="10">
        Memuat klasemen...
      </td>
    </tr>
  `;


  const matches =
    await getMatches();


  const table =
    calculateTable(matches);


  if (table.length === 0) {

    tbody.innerHTML = `
      <tr>
        <td colspan="10">
          Belum ada pertandingan.
        </td>
      </tr>
    `;

    return;

  }


  tbody.innerHTML =
    table.map((team, index) => {

      const gdClass =
        team.gd > 0
          ? "positive"
          : team.gd < 0
          ? "negative"
          : "";


      const gd =
        team.gd > 0
          ? "+" + team.gd
          : team.gd;


      return `

        <tr>

          <td class="position">
            ${index + 1}
          </td>

          <td>
            ${escapeHTML(team.name)}
          </td>

          <td>
            ${team.mp}
          </td>

          <td>
            ${team.w}
          </td>

          <td>
            ${team.d}
          </td>

          <td>
            ${team.l}
          </td>

          <td>
            ${team.gf}
          </td>

          <td>
            ${team.ga}
          </td>

          <td class="${gdClass}">
            ${gd}
          </td>

          <td>
            ${team.pts}
          </td>

        </tr>

      `;

    }).join("");

}


// ==========================================
// MATCH TERBARU
// ==========================================

async function loadMatches() {

  const list =
    document.getElementById("matchList");


  list.innerHTML =
    `<div class="loading">
      Memuat pertandingan...
    </div>`;


  const matches =
    await getMatches();


  if (matches.length === 0) {

    list.innerHTML =
      `<div class="loading">
        Belum ada pertandingan.
      </div>`;

    return;

  }


  list.innerHTML =
    matches.map(match => {

      return `

        <div class="match">

          <div class="match-team">
            ${escapeHTML(match.team1)}
          </div>

          <div class="match-score">

            <strong>
              ${match.score1} - ${match.score2}
            </strong>

            <small>
              ${escapeHTML(match.status)}
            </small>

          </div>

          <div class="match-team right">
            ${escapeHTML(match.team2)}
          </div>

        </div>

      `;

    }).join("");

}


// ==========================================
// TAMBAH MATCH
// ==========================================

async function addMatch() {

  const team1 =
    document.getElementById("team1")
      .value.trim();

  const team2 =
    document.getElementById("team2")
      .value.trim();

  const score1 =
    Number(
      document.getElementById("score1")
        .value
    );

  const score2 =
    Number(
      document.getElementById("score2")
        .value
    );


  const message =
    document.getElementById("message");


  if (!team1 || !team2) {

    message.textContent =
      "❌ Nama team harus diisi.";

    return;

  }


  if (
    !Number.isInteger(score1) ||
    !Number.isInteger(score2) ||
    score1 < 0 ||
    score2 < 0
  ) {

    message.textContent =
      "❌ Skor tidak valid.";

    return;

  }


  // Pastikan login

  const { data } =
    await supabaseClient
      .auth
      .getSession();


  if (!data.session) {

    message.textContent =
      "❌ Silakan login terlebih dahulu.";

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

    console.error(error);

    message.textContent =
      "❌ Gagal menyimpan pertandingan.";

    return;

  }


  message.textContent =
    "✅ Hasil pertandingan disimpan!";


  document.getElementById("team1")
    .value = "";

  document.getElementById("team2")
    .value = "";

  document.getElementById("score1")
    .value = "0";

  document.getElementById("score2")
    .value = "0";


  loadLeagueTable();

  loadMatches();

  updateStats();

}


// ==========================================
// STATISTIK HOME
// ==========================================

async function updateStats() {

  const matches =
    await getMatches();


  document.getElementById("totalMatches")
    .textContent =
      matches.length;


  const teams =
    new Set();


  matches.forEach(match => {

    teams.add(match.team1);
    teams.add(match.team2);

  });


  document.getElementById("totalTeams")
    .textContent =
      teams.size;

}


// ==========================================
// LOGIN ADMIN
// ==========================================

async function loginAdmin() {

  const email =
    document.getElementById("loginEmail")
      .value.trim();

  const password =
    document.getElementById("loginPassword")
      .value;


  const message =
    document.getElementById("loginMessage");


  const { error } =
    await supabaseClient
      .auth
      .signInWithPassword({

        email: email,

        password: password

      });


  if (error) {

    message.textContent =
      "❌ Login gagal.";

    return;

  }


  message.textContent =
    "✅ Login berhasil.";


  document.getElementById("loginBox")
    .style.display = "none";


  document.getElementById("adminPanel")
    .style.display = "block";

}


// ==========================================
// LOGOUT
// ==========================================

async function logoutAdmin() {

  await supabaseClient
    .auth
    .signOut();


  document.getElementById("loginBox")
    .style.display = "block";


  document.getElementById("adminPanel")
    .style.display = "none";

}


// ==========================================
// CEK LOGIN
// ==========================================

async function checkLogin() {

  const { data } =
    await supabaseClient
      .auth
      .getSession();


  if (data.session) {

    document.getElementById("loginBox")
      .style.display = "none";

    document.getElementById("adminPanel")
      .style.display = "block";

  }

}


// ==========================================
// REALTIME
// ==========================================

supabaseClient
  .channel("league-live")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "matches"
    },
    () => {

      loadLeagueTable();

      loadMatches();

      updateStats();

    }
  )
  .subscribe();


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHTML(text) {

  return String(text)

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#039;");

}


// ==========================================
// START
// ==========================================

loadLeagueTable();

loadMatches();

updateStats();

checkLogin();
