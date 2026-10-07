const SUPABASE_URL = "https://jrhgxphgvahlrodjtjzs.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_SuCUxQSZRQGr_GsS1TCy5Q_ItEUJB4d";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


/* =========================
   NAVIGATION
========================= */

function showPage(pageName, button = null) {

  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });

  const target = document.getElementById(pageName);

  if (target) {
    target.classList.add("active");
  }

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  if (button) {
    button.classList.add("active");
  }

  if (pageName === "table") {
    loadLeagueTable();
  }

  if (pageName === "matches") {
    loadMatches();
  }
}


/* =========================
   GET MATCHES
========================= */

async function getMatches() {

  const { data, error } = await supabaseClient
    .from("matches")
    .select("*")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}


/* =========================
   CALCULATE TABLE + FORM
========================= */

function calculateTable(matches) {

  const teams = {};

  function createTeam(name) {

    if (!teams[name]) {

      teams[name] = {
        name: name,
        mp: 0,
        w: 0,
        d: 0,
        l: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        pts: 0,
        form: []
      };

    }

  }


  matches.forEach(match => {

    const team1 = match.team1.trim();
    const team2 = match.team2.trim();

    const score1 = Number(match.score1);
    const score2 = Number(match.score2);

    createTeam(team1);
    createTeam(team2);

    teams[team1].mp++;
    teams[team2].mp++;

    teams[team1].gf += score1;
    teams[team1].ga += score2;

    teams[team2].gf += score2;
    teams[team2].ga += score1;


    if (score1 > score2) {

      teams[team1].w++;
      teams[team1].pts += 3;

      teams[team2].l++;

      teams[team1].form.push("W");
      teams[team2].form.push("L");

    }

    else if (score1 < score2) {

      teams[team2].w++;
      teams[team2].pts += 3;

      teams[team1].l++;

      teams[team1].form.push("L");
      teams[team2].form.push("W");

    }

    else {

      teams[team1].d++;
      teams[team2].d++;

      teams[team1].pts++;
      teams[team2].pts++;

      teams[team1].form.push("D");
      teams[team2].form.push("D");

    }

  });


  Object.values(teams).forEach(team => {
    team.gd = team.gf - team.ga;
  });


  return Object.values(teams).sort((a, b) => {

    return (
      b.pts - a.pts ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      a.name.localeCompare(b.name)
    );

  });

}


/* =========================
   FORM HTML
========================= */

function renderForm(form) {

  const recent = form.slice(-5).reverse();

  if (recent.length === 0) {
    return `<span class="no-form">—</span>`;
  }

  return recent.map(result => {

    let className = "";
    let symbol = "";

    if (result === "W") {
      className = "win";
      symbol = "W";
    }

    else if (result === "D") {
      className = "draw";
      symbol = "D";
    }

    else {
      className = "loss";
      symbol = "L";
    }

    return `
      <span
        class="form-dot ${className}"
        title="${result === "W" ? "Menang" : result === "D" ? "Seri" : "Kalah"}"
      >
        ${symbol}
      </span>
    `;

  }).join("");

}


/* =========================
   LOAD LEAGUE TABLE
========================= */

async function loadLeagueTable() {

  const tbody = document.getElementById("leagueTable");

  tbody.innerHTML = `
    <tr>
      <td colspan="11" class="loading">
        Memuat klasemen...
      </td>
    </tr>
  `;

  const matches = await getMatches();

  const teams = calculateTable(matches);

  if (teams.length === 0) {

    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="loading">
          Belum ada pertandingan.
        </td>
      </tr>
    `;

    return;
  }


  tbody.innerHTML = teams.map((team, index) => {

    const gdClass =
      team.gd > 0
        ? "positive"
        : team.gd < 0
          ? "negative"
          : "";

    return `
      <tr>

        <td class="position">
          ${index + 1}
        </td>

        <td>
          <div class="team-name">
            <span class="team-dot"></span>
            ${escapeHTML(team.name)}
          </div>
        </td>

        <td>
          <div class="form">
            ${renderForm(team.form)}
          </div>
        </td>

        <td>${team.mp}</td>
        <td class="positive">${team.w}</td>
        <td>${team.d}</td>
        <td class="negative">${team.l}</td>
        <td>${team.gf}</td>
        <td>${team.ga}</td>

        <td class="${gdClass}">
          ${team.gd > 0 ? "+" : ""}${team.gd}
        </td>

        <td class="pts">
          ${team.pts}
        </td>

      </tr>
    `;

  }).join("");

}


/* =========================
   LOAD MATCHES
========================= */

async function loadMatches() {

  const container = document.getElementById("matchList");

  container.innerHTML = `
    <div class="loading-box">
      Memuat pertandingan...
    </div>
  `;

  const matches = await getMatches();

  const latestMatches = [...matches].reverse();

  if (latestMatches.length === 0) {

    container.innerHTML = `
      <div class="loading-box">
        Belum ada pertandingan.
      </div>
    `;

    return;
  }


  container.innerHTML = latestMatches.map(match => {

    const date = new Date(match.created_at);

    return `
      <div class="match-card">

        <div class="match-team">
          ${escapeHTML(match.team1)}
        </div>

        <div class="match-score">

          <strong>
            ${match.score1} - ${match.score2}
          </strong>

          <small>
            ${escapeHTML(match.status || "FT")}
          </small>

          <div class="match-date">
            ${date.toLocaleDateString("id-ID")}
          </div>

        </div>

        <div class="match-team right">
          ${escapeHTML(match.team2)}
        </div>

      </div>
    `;

  }).join("");

}


/* =========================
   ADD MATCH
========================= */

async function addMatch() {

  const team1 = document.getElementById("team1").value.trim();
  const team2 = document.getElementById("team2").value.trim();

  const score1 = Number(
    document.getElementById("score1").value
  );

  const score2 = Number(
    document.getElementById("score2").value
  );

  const message = document.getElementById("adminMessage");


  if (!team1 || !team2) {

    message.textContent = "Nama kedua tim wajib diisi.";
    message.style.color = "#ff5268";

    return;
  }


  if (
    Number.isNaN(score1) ||
    Number.isNaN(score2) ||
    score1 < 0 ||
    score2 < 0
  ) {

    message.textContent = "Score tidak valid.";
    message.style.color = "#ff5268";

    return;
  }


  const {
    data: { session }
  } = await supabaseClient.auth.getSession();


  if (!session) {

    message.textContent = "Silakan login sebagai admin.";
    message.style.color = "#ff5268";

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
      "Gagal menambahkan pertandingan: " + error.message;

    message.style.color = "#ff5268";

    return;
  }


  message.textContent = "✓ Pertandingan berhasil ditambahkan!";
  message.style.color = "#20d878";


  document.getElementById("team1").value = "";
  document.getElementById("team2").value = "";
  document.getElementById("score1").value = 0;
  document.getElementById("score2").value = 0;


  await loadLeagueTable();
  await loadMatches();
  await updateStats();

}


/* =========================
   STATS
========================= */

async function updateStats() {

  const matches = await getMatches();

  document.getElementById("totalMatches").textContent =
    matches.length;


  const teams = new Set();

  matches.forEach(match => {
    teams.add(match.team1.trim());
    teams.add(match.team2.trim());
  });


  document.getElementById("totalTeams").textContent =
    teams.size;

}


/* =========================
   LOGIN
========================= */

async function loginAdmin() {

  const email =
    document.getElementById("loginEmail").value.trim();

  const password =
    document.getElementById("loginPassword").value;

  const message =
    document.getElementById("loginMessage");


  const { error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });


  if (error) {

    message.textContent =
      "Login gagal: " + error.message;

    message.style.color = "#ff5268";

    return;
  }


  message.textContent = "Login berhasil.";
  message.style.color = "#20d878";

  await checkLogin();

}


/* =========================
   LOGOUT
========================= */

async function logoutAdmin() {

  await supabaseClient.auth.signOut();

  await checkLogin();

}


/* =========================
   CHECK LOGIN
========================= */

async function checkLogin() {

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();


  const loginBox =
    document.getElementById("loginBox");

  const adminPanel =
    document.getElementById("adminPanel");


  if (session) {

    loginBox.classList.add("hidden");
    adminPanel.classList.remove("hidden");

  }

  else {

    loginBox.classList.remove("hidden");
    adminPanel.classList.add("hidden");

  }

}


/* =========================
   REALTIME
========================= */

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


/* =========================
   SECURITY HELPER
========================= */

function escapeHTML(text) {

  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* =========================
   START
========================= */

loadLeagueTable();
loadMatches();
updateStats();
checkLogin();
