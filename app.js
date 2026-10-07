const SUPABASE_URL = "https://jrhgxphgvahlrodjtjzs.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_SuCUxQSZRQGr_GsS1TCy5Q_ItEUJB4d";

let supabaseClient = null;

try {
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );
} catch (error) {
  console.error("Supabase gagal:", error);
}


/* =========================
   GLOBAL DATA
========================= */

let teams = [];
let fixtures = [];
let matches = [];

let currentFixture = 0;
let fixtureTimer = null;


/* =========================
   NAVIGATION
========================= */

function showPage(page) {
  document.querySelectorAll(".page").forEach(section => {
    section.classList.remove("active");
  });

  const target = document.getElementById(page);

  if (target) {
    target.classList.add("active");
  }

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle(
      "active",
      btn.dataset.page === page
    );
  });
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

window.showPage = showPage;


/* =========================
   LOAD TEAMS
========================= */

async function loadTeams() {
  if (!supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("teams")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Gagal mengambil tim:", error);
    return;
  }

  teams = data || [];

  renderTeamList();
  populateTeamSelects();
  updateStats();
}


/* =========================
   TEAM LIST ADMIN
========================= */

function renderTeamList() {
  const container = document.getElementById("teamAdminList");

  if (!container) return;

  if (teams.length === 0) {
    container.innerHTML = `
      <p>Belum ada tim.</p>
    `;
    return;
  }

  container.innerHTML = teams.map((team, index) => `
    <div class="admin-team-item">
      <span>${index + 1}. ${escapeHTML(team.name)}</span>
    </div>
  `).join("");
}


/* =========================
   TEAM SELECT
========================= */

function populateTeamSelects() {

  const select1 = document.getElementById("matchTeam1Select");
  const select2 = document.getElementById("matchTeam2Select");

  if (!select1 || !select2) return;

  select1.innerHTML =
    `<option value="">Pilih tim 1</option>`;

  select2.innerHTML =
    `<option value="">Pilih tim 2</option>`;

  teams.forEach(team => {

    const option1 = document.createElement("option");
    option1.value = team.name;
    option1.textContent = team.name;

    const option2 = document.createElement("option");
    option2.value = team.name;
    option2.textContent = team.name;

    select1.appendChild(option1);
    select2.appendChild(option2);
  });
}


/* =========================
   ADD TEAM
========================= */

async function addTeam() {

  const input = document.getElementById("teamNameInput");
  const message = document.getElementById("teamMessage");

  const name = input.value.trim();

  if (!name) {
    message.textContent = "Masukkan nama tim.";
    return;
  }

  const exists = teams.some(
    team => team.name.toLowerCase() === name.toLowerCase()
  );

  if (exists) {
    message.textContent = "Tim tersebut sudah ada.";
    return;
  }

  const { error } = await supabaseClient
    .from("teams")
    .insert({
      name: name
    });

  if (error) {
    console.error(error);
    message.textContent = "Gagal menambahkan tim.";
    return;
  }

  input.value = "";
  message.textContent = "Tim berhasil ditambahkan.";

  await loadTeams();
}


/* =========================
   GENERATE JADWAL
========================= */

async function generateFixtures() {

  const message = document.getElementById("fixtureMessage");

  if (teams.length < 2) {
    message.textContent =
      "Minimal harus ada 2 tim.";
    return;
  }

  if (fixtures.length > 0) {
    const confirmGenerate = confirm(
      "Jadwal sudah ada. Generate ulang akan membuat jadwal baru. Lanjut?"
    );

    if (!confirmGenerate) return;

    const { error: deleteError } =
      await supabaseClient
        .from("fixtures")
        .delete()
        .neq("id", 0);

    if (deleteError) {
      console.error(deleteError);
      message.textContent =
        "Gagal menghapus jadwal lama.";
      return;
    }
  }

  /*
    Round robin / sistem liga.
    Setiap tim bertemu satu kali.
  */

  let teamNames = teams.map(team => team.name);

  // Jika jumlah tim ganjil, tambahkan BYE
  if (teamNames.length % 2 !== 0) {
    teamNames.push("BYE");
  }

  const totalTeams = teamNames.length;
  const totalRounds = totalTeams - 1;
  const matchesPerRound = totalTeams / 2;

  const generatedFixtures = [];

  for (let round = 0; round < totalRounds; round++) {

    for (let i = 0; i < matchesPerRound; i++) {

      const home = teamNames[i];
      const away =
        teamNames[totalTeams - 1 - i];

      if (home !== "BYE" && away !== "BYE") {

        generatedFixtures.push({
          team1: home,
          team2: away,
          matchday: round + 1,
          status: "UPCOMING"
        });

      }
    }

    // Rotasi sistem round robin
    const fixed = teamNames[0];

    const rotating = teamNames.slice(1);

    rotating.unshift(
      rotating.pop()
    );

    teamNames = [fixed, ...rotating];
  }


  const { error } = await supabaseClient
    .from("fixtures")
    .insert(generatedFixtures);

  if (error) {
    console.error(error);
    message.textContent =
      "Gagal membuat jadwal.";
    return;
  }

  message.textContent =
    `${generatedFixtures.length} pertandingan berhasil dibuat.`;

  await loadFixtures();
}


/* =========================
   LOAD FIXTURES
========================= */

async function loadFixtures() {

  const { data, error } = await supabaseClient
    .from("fixtures")
    .select("*")
    .order("matchday", {
      ascending: true
    })
    .order("id", {
      ascending: true
    });

  if (error) {
    console.error(error);
    return;
  }

  fixtures = data || [];

  renderUpcoming();
  renderHomeFixture();
  updateStats();
}


/* =========================
   UPCOMING
========================= */

function renderUpcoming() {

  const container =
    document.getElementById("upcomingList");

  if (!container) return;

  const upcoming = fixtures.filter(
    fixture => fixture.status === "UPCOMING"
  );

  if (upcoming.length === 0) {
    container.innerHTML =
      `<p>Belum ada pertandingan mendatang.</p>`;
    return;
  }

  container.innerHTML = upcoming.map(fixture => `
    <div class="match-card">
      <small>MATCHDAY ${fixture.matchday}</small>

      <div class="match-teams">
        <span>${escapeHTML(fixture.team1)}</span>
        <strong>VS</strong>
        <span>${escapeHTML(fixture.team2)}</span>
      </div>
    </div>
  `).join("");
}


/* =========================
   HOME FIXTURE SLIDER
========================= */

function renderHomeFixture() {

  const upcoming = fixtures.filter(
    fixture => fixture.status === "UPCOMING"
  );

  if (upcoming.length === 0) {

    document.getElementById("fixtureTeam1").textContent = "-";
    document.getElementById("fixtureTeam2").textContent = "-";
    document.getElementById("fixtureMatchday").textContent =
      "Belum ada jadwal";

    document.getElementById("fixtureDate").textContent = "";

    return;
  }

  if (currentFixture >= upcoming.length) {
    currentFixture = 0;
  }

  const fixture = upcoming[currentFixture];

  document.getElementById("fixtureTeam1").textContent =
    fixture.team1;

  document.getElementById("fixtureTeam2").textContent =
    fixture.team2;

  document.getElementById("fixtureMatchday").textContent =
    `MATCHDAY ${fixture.matchday}`;

  document.getElementById("fixtureDate").textContent =
    fixture.scheduled_at
      ? formatDate(fixture.scheduled_at)
      : "Jadwal pertandingan";

  const dots =
    document.getElementById("fixtureDots");

  dots.innerHTML = upcoming.map((_, index) => `
    <span class="${index === currentFixture ? "active" : ""}"></span>
  `).join("");
}


/* =========================
   SLIDER BUTTON
========================= */

document
  .getElementById("prevFixture")
  .addEventListener("click", () => {

    const upcoming = fixtures.filter(
      fixture => fixture.status === "UPCOMING"
    );

    if (upcoming.length === 0) return;

    currentFixture--;

    if (currentFixture < 0) {
      currentFixture = upcoming.length - 1;
    }

    renderHomeFixture();
  });


document
  .getElementById("nextFixture")
  .addEventListener("click", () => {

    const upcoming = fixtures.filter(
      fixture => fixture.status === "UPCOMING"
    );

    if (upcoming.length === 0) return;

    currentFixture++;

    if (currentFixture >= upcoming.length) {
      currentFixture = 0;
    }

    renderHomeFixture();
  });


/* AUTO ROLL */

fixtureTimer = setInterval(() => {

  const upcoming = fixtures.filter(
    fixture => fixture.status === "UPCOMING"
  );

  if (upcoming.length <= 1) return;

  currentFixture++;

  if (currentFixture >= upcoming.length) {
    currentFixture = 0;
  }

  renderHomeFixture();

}, 5000);


/* =========================
   LOAD MATCHES
========================= */

async function loadMatches() {

  const { data, error } = await supabaseClient
    .from("matches")
    .select("*")
    .order("id", {
      ascending: false
    });

  if (error) {
    console.error(error);
    return;
  }

  matches = data || [];

  renderMatches();
  calculateTable();
  updateStats();
}


/* =========================
   RESULTS
========================= */

function renderMatches() {

  const container =
    document.getElementById("matchList");

  if (!container) return;

  if (matches.length === 0) {
    container.innerHTML =
      `<p>Belum ada hasil pertandingan.</p>`;
    return;
  }

  container.innerHTML = matches.map(match => {

    let result1 = "";
    let result2 = "";

    if (match.score1 > match.score2) {
      result1 = "win";
      result2 = "loss";
    }

    if (match.score1 < match.score2) {
      result1 = "loss";
      result2 = "win";
    }

    if (match.score1 === match.score2) {
      result1 = "draw";
      result2 = "draw";
    }

    return `
      <div class="match-card">

        <small>${escapeHTML(match.status)}</small>

        <div class="match-teams">

          <span class="${result1}">
            ${escapeHTML(match.team1)}
          </span>

          <strong>
            ${match.score1} - ${match.score2}
          </strong>

          <span class="${result2}">
            ${escapeHTML(match.team2)}
          </span>

        </div>

      </div>
    `;

  }).join("");
}


/* =========================
   TABLE
========================= */

function calculateTable() {

  const table = {};

  teams.forEach(team => {

    table[team.name] = {
      team: team.name,
      mp: 0,
      w: 0,
      d: 0,
      l: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      pts: 0
    };

  });


  matches.forEach(match => {

    if (!table[match.team1]) {
      table[match.team1] = createTeamStats(
        match.team1
      );
    }

    if (!table[match.team2]) {
      table[match.team2] = createTeamStats(
        match.team2
      );
    }

    const a = table[match.team1];
    const b = table[match.team2];

    a.mp++;
    b.mp++;

    a.gf += match.score1;
    a.ga += match.score2;

    b.gf += match.score2;
    b.ga += match.score1;

    if (match.score1 > match.score2) {

      a.w++;
      a.pts += 3;
      b.l++;

    } else if (match.score1 < match.score2) {

      b.w++;
      b.pts += 3;
      a.l++;

    } else {

      a.d++;
      b.d++;

      a.pts++;
      b.pts++;
    }

  });


  Object.values(table).forEach(team => {
    team.gd = team.gf - team.ga;
  });


  const sorted =
    Object.values(table).sort((a, b) => {

      if (b.pts !== a.pts) {
        return b.pts - a.pts;
      }

      if (b.gd !== a.gd) {
        return b.gd - a.gd;
      }

      return b.gf - a.gf;

    });


  const tbody =
    document.getElementById("leagueTable");

  tbody.innerHTML = sorted.map((team, index) => `

    <tr>

      <td>${index + 1}</td>

      <td>${escapeHTML(team.team)}</td>

      <td>${team.mp}</td>

      <td>${team.w}</td>

      <td>${team.d}</td>

      <td>${team.l}</td>

      <td>${team.gd}</td>

      <td><strong>${team.pts}</strong></td>

    </tr>

  `).join("");
}


function createTeamStats(name) {

  return {
    team: name,
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


/* =========================
   ADD RESULT
========================= */

async function addMatch() {

  const team1 =
    document.getElementById("matchTeam1Select").value;

  const team2 =
    document.getElementById("matchTeam2Select").value;

  const score1 =
    Number(document.getElementById("matchScore1").value);

  const score2 =
    Number(document.getElementById("matchScore2").value);

  const message =
    document.getElementById("matchMessage");


  if (!team1 || !team2) {
    message.textContent =
      "Pilih kedua tim.";
    return;
  }

  if (team1 === team2) {
    message.textContent =
      "Tim tidak boleh sama.";
    return;
  }

  if (
    document.getElementById("matchScore1").value === "" ||
    document.getElementById("matchScore2").value === ""
  ) {
    message.textContent =
      "Masukkan skor.";
    return;
  }


  const { error } = await supabaseClient
    .from("matches")
    .insert({
      team1,
      score1,
      score2,
      team2,
      status: "FT"
    });


  if (error) {

    console.error(error);

    message.textContent =
      "Gagal menyimpan hasil.";

    return;
  }


  /*
    Kalau pertandingan tersebut ada di fixtures,
    otomatis ubah statusnya menjadi PLAYED.
  */

  await supabaseClient
    .from("fixtures")
    .update({
      status: "PLAYED"
    })
    .eq("team1", team1)
    .eq("team2", team2)
    .eq("status", "UPCOMING");


  document.getElementById("matchScore1").value = "";
  document.getElementById("matchScore2").value = "";

  message.textContent =
    "Hasil berhasil disimpan.";

  await loadMatches();
  await loadFixtures();
}


/* =========================
   LOGIN
========================= */

async function checkLogin() {

  const {
    data: {
      session
    }
  } = await supabaseClient.auth.getSession();

  updateAdminUI(session);
}


function updateAdminUI(session) {

  const loginBox =
    document.getElementById("loginBox");

  const adminPanel =
    document.getElementById("adminPanel");

  if (session) {

    loginBox.style.display = "none";
    adminPanel.style.display = "block";

  } else {

    loginBox.style.display = "block";
    adminPanel.style.display = "none";

  }
}


async function login() {

  const email =
    document.getElementById("loginEmail").value;

  const password =
    document.getElementById("loginPassword").value;

  const message =
    document.getElementById("loginMessage");


  const {
    data,
    error
  } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });


  if (error) {

    message.textContent =
      "Login gagal.";

    console.error(error);

    return;
  }


  message.textContent =
    "Login berhasil.";

  updateAdminUI(data.session);

  await loadTeams();
}


async function logout() {

  await supabaseClient.auth.signOut();

  updateAdminUI(null);
}


/* =========================
   STATS
========================= */

function updateStats() {

  const totalTeams =
    document.getElementById("totalTeams");

  const totalMatches =
    document.getElementById("totalMatches");

  const playedMatches =
    document.getElementById("playedMatches");


  if (totalTeams) {
    totalTeams.textContent = teams.length;
  }

  if (totalMatches) {
    totalMatches.textContent =
      fixtures.length;
  }

  if (playedMatches) {
    playedMatches.textContent =
      matches.length;
  }
}


/* =========================
   HELPERS
========================= */

function formatDate(date) {

  return new Date(date).toLocaleString(
    "id-ID",
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  );

}


function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


/* =========================
   BUTTON EVENTS
========================= */

document
  .getElementById("loginBtn")
  .addEventListener("click", login);

document
  .getElementById("logoutBtn")
  .addEventListener("click", logout);

document
  .getElementById("addTeamBtn")
  .addEventListener("click", addTeam);

document
  .getElementById("generateFixturesBtn")
  .addEventListener(
    "click",
    generateFixtures
  );

document
  .getElementById("addMatchBtn")
  .addEventListener(
    "click",
    addMatch
  );


/* =========================
   REALTIME
========================= */

supabaseClient
  .channel("teams-realtime")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "teams"
    },
    async () => {
      await loadTeams();
    }
  )
  .subscribe();


supabaseClient
  .channel("fixtures-realtime")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "fixtures"
    },
    async () => {
      await loadFixtures();
    }
  )
  .subscribe();


supabaseClient
  .channel("matches-realtime")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "matches"
    },
    async () => {
      await loadMatches();
    }
  )
  .subscribe();


/* =========================
   INIT
========================= */

async function init() {

  await loadTeams();
  await loadMatches();
  await loadFixtures();
  await checkLogin();
  calculateTable();
}

init();
