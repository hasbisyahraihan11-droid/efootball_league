const SUPABASE_URL =
  "https://jrhgxphgvahlrodjtjzs.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_SuCUxQSZRQGr_GsS1TCy5Q_ItEUJB4d";


/*
  GANTI INI DENGAN UUID ADMIN SUPABASE KAMU
*/
const ADMIN_UUID = "16544963-125c-4369-a8f3-2d8c9091679f";


const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


let teams = [];
let fixtures = [];
let matches = [];

let currentFixtureIndex = 0;
let selectedTeam = null;

let autoSlide;


/* =========================
   HELPER
========================= */

function $(id) {
  return document.getElementById(id);
}


function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================
   NAVIGATION
========================= */

document.querySelectorAll(".nav-btn").forEach(button => {

  button.addEventListener("click", () => {

    const page = button.dataset.page;

    document.querySelectorAll(".nav-btn")
      .forEach(btn => btn.classList.remove("active"));

    button.classList.add("active");


    document.querySelectorAll(".page")
      .forEach(section => section.classList.remove("active-page"));

    $(page).classList.add("active-page");

  });

});


/* =========================
   LOAD TEAMS
========================= */

async function loadTeams() {

  const { data, error } = await supabaseClient
    .from("teams")
    .select("*")
    .order("name", { ascending: true });


  if (error) {

    console.error(error);

    return;

  }


  teams = data || [];

  renderTeamList();

  calculateTable();

}


/* =========================
   ADMIN TEAM LIST
========================= */

function renderTeamList() {

  if (!teams.length) {

    $("teamAdminList").innerHTML =
      `<div class="empty">Belum ada tim.</div>`;

    return;

  }


  $("teamAdminList").innerHTML =
    teams.map(team => {

      const logo = team.logo
        ? `<img src="${escapeHTML(team.logo)}" alt="">`
        : `<div class="team-logo-placeholder">⚽</div>`;


      return `
        <div class="admin-team">

          ${logo}

          <span>
            ${escapeHTML(team.name)}
          </span>

        </div>
      `;

    }).join("");

}


/* =========================
   ADD TEAM
========================= */

async function addTeam() {

  const name =
    $("teamNameInput").value.trim();

  const logo =
    $("teamLogoInput").value.trim();


  if (!name) {

    $("teamMessage").textContent =
      "Nama tim wajib diisi.";

    return;

  }


  const { error } = await supabaseClient
    .from("teams")
    .insert({
      name: name,
      logo: logo || null
    });


  if (error) {

    $("teamMessage").textContent =
      error.message;

    return;

  }


  $("teamNameInput").value = "";
  $("teamLogoInput").value = "";

  $("teamMessage").textContent =
    "Tim berhasil ditambahkan.";


  await loadTeams();

}


$("addTeamBtn").addEventListener(
  "click",
  addTeam
);


/* =========================
   ROUND ROBIN
========================= */

function generateRoundRobin(teamNames) {

  let list = [...teamNames];

  if (list.length % 2 !== 0) {
    list.push(null);
  }


  const rounds = list.length - 1;

  const half = list.length / 2;

  const result = [];


  for (let round = 0; round < rounds; round++) {

    const matchesThisRound = [];


    for (let i = 0; i < half; i++) {

      const home = list[i];

      const away = list[list.length - 1 - i];


      if (home && away) {

        matchesThisRound.push({
          team1: home,
          team2: away,
          matchday: round + 1
        });

      }

    }


    result.push(...matchesThisRound);


    const fixed = list[0];

    const rotating = list.slice(1);

    rotating.unshift(rotating.pop());

    list = [fixed, ...rotating];

  }


  return result;

}


/* =========================
   GENERATE FIXTURES
========================= */

async function generateFixtures() {

  if (teams.length < 2) {

    $("fixtureMessage").textContent =
      "Minimal harus ada 2 tim.";

    return;

  }


  const { data: existing } =
    await supabaseClient
      .from("fixtures")
      .select("id")
      .limit(1);


  if (existing && existing.length > 0) {

    $("fixtureMessage").textContent =
      "Jadwal sudah tersedia.";

    return;

  }


  const teamNames =
    teams.map(team => team.name);


  const generated =
    generateRoundRobin(teamNames);


  const { error } =
    await supabaseClient
      .from("fixtures")
      .insert(generated);


  if (error) {

    $("fixtureMessage").textContent =
      error.message;

    return;

  }


  $("fixtureMessage").textContent =
    "Jadwal berhasil dibuat.";


  await loadFixtures();

}


$("generateFixturesBtn").addEventListener(
  "click",
  generateFixtures
);


/* =========================
   LOAD FIXTURES
========================= */

async function loadFixtures() {

  const { data, error } =
    await supabaseClient
      .from("fixtures")
      .select("*")
      .order("matchday", { ascending: true })
      .order("id", { ascending: true });


  if (error) {

    console.error(error);

    return;

  }


  fixtures = data || [];


  renderHomeFixture();

  renderFixtureSelector();

  renderSelectedTeamDetail();

}


/* =========================
   UPCOMING FIXTURES
========================= */

function getUpcomingFixtures() {

  return fixtures.filter(
    fixture => fixture.status !== "PLAYED"
  );

}


/* =========================
   HOME FIXTURE
========================= */

function renderHomeFixture() {

  const upcoming =
    getUpcomingFixtures();


  if (!upcoming.length) {

    $("homeFixture").innerHTML = `
      <div class="empty">
        Belum ada pertandingan berikutnya.
      </div>
    `;

    return;

  }


  if (
    currentFixtureIndex >= upcoming.length
  ) {

    currentFixtureIndex = 0;

  }


  const fixture =
    upcoming[currentFixtureIndex];


  $("homeFixture").innerHTML = `

    <div class="fixture-box">

      <div>

        <div class="fixture-matchday">
          MATCHDAY ${fixture.matchday}
        </div>

        <div class="fixture-teams">

          <div class="fixture-team">
            ${escapeHTML(fixture.team1)}
          </div>

          <div class="fixture-vs">
            VS
          </div>

          <div class="fixture-team">
            ${escapeHTML(fixture.team2)}
          </div>

        </div>

        <div class="fixture-vs">
          UPCOMING
        </div>

      </div>

    </div>

  `;

}


/* =========================
   SLIDER
========================= */

function nextFixture() {

  const upcoming =
    getUpcomingFixtures();


  if (!upcoming.length) return;


  currentFixtureIndex++;

  if (
    currentFixtureIndex >= upcoming.length
  ) {

    currentFixtureIndex = 0;

  }


  renderHomeFixture();

}


function prevFixture() {

  const upcoming =
    getUpcomingFixtures();


  if (!upcoming.length) return;


  currentFixtureIndex--;

  if (currentFixtureIndex < 0) {

    currentFixtureIndex =
      upcoming.length - 1;

  }


  renderHomeFixture();

}


$("nextFixture").addEventListener(
  "click",
  nextFixture
);


$("prevFixture").addEventListener(
  "click",
  prevFixture
);


autoSlide = setInterval(
  nextFixture,
  5000
);


/* =========================
   ADMIN FIXTURE SELECT
========================= */

function renderFixtureSelector() {

  const select =
    $("matchFixtureSelect");


  const upcoming =
    getUpcomingFixtures();


  select.innerHTML =
    `<option value="">
      Pilih pertandingan
    </option>`;


  upcoming.forEach(fixture => {

    select.innerHTML += `

      <option value="${fixture.id}">

        Matchday ${fixture.matchday} —
        ${escapeHTML(fixture.team1)}
        vs
        ${escapeHTML(fixture.team2)}

      </option>

    `;

  });

}


/* =========================
   LOAD MATCHES
========================= */

async function loadMatches() {

  const { data, error } =
    await supabaseClient
      .from("matches")
      .select("*")
      .order("id", { ascending: true });


  if (error) {

    console.error(error);

    return;

  }


  matches = data || [];


  calculateTable();

  renderSelectedTeamDetail();

}


/* =========================
   INPUT RESULT
========================= */

async function addMatch() {

  const fixtureId =
    $("matchFixtureSelect").value;

  const score1 =
    Number($("matchScore1").value);

  const score2 =
    Number($("matchScore2").value);


  if (!fixtureId) {

    $("matchMessage").textContent =
      "Pilih pertandingan.";

    return;

  }


  if (
    !Number.isInteger(score1) ||
    !Number.isInteger(score2) ||
    score1 < 0 ||
    score2 < 0
  ) {

    $("matchMessage").textContent =
      "Masukkan skor yang valid.";

    return;

  }


  const fixture =
    fixtures.find(
      item => String(item.id) === String(fixtureId)
    );


  if (!fixture) {

    $("matchMessage").textContent =
      "Pertandingan tidak ditemukan.";

    return;

  }


  const { error: matchError } =
    await supabaseClient
      .from("matches")
      .insert({

        team1: fixture.team1,

        score1: score1,

        score2: score2,

        team2: fixture.team2,

        status: "FT"

      });


  if (matchError) {

    $("matchMessage").textContent =
      matchError.message;

    return;

  }


  const { error: fixtureError } =
    await supabaseClient
      .from("fixtures")
      .update({
        status: "PLAYED"
      })
      .eq("id", fixture.id);


  if (fixtureError) {

    $("matchMessage").textContent =
      fixtureError.message;

    return;

  }


  $("matchScore1").value = "";
  $("matchScore2").value = "";

  $("matchFixtureSelect").value = "";

  $("matchMessage").textContent =
    "Hasil berhasil disimpan.";


  await loadFixtures();

  await loadMatches();

}


$("addMatchBtn").addEventListener(
  "click",
  addMatch
);


/* =========================
   TABLE
========================= */

function calculateTable() {

  const stats = {};


  teams.forEach(team => {

    stats[team.name] = {

      name: team.name,

      played: 0,

      wins: 0,

      draws: 0,

      losses: 0,

      gf: 0,

      ga: 0,

      gd: 0,

      points: 0

    };

  });


  matches.forEach(match => {

    if (!stats[match.team1]) return;

    if (!stats[match.team2]) return;


    const t1 =
      stats[match.team1];

    const t2 =
      stats[match.team2];


    const s1 =
      Number(match.score1);

    const s2 =
      Number(match.score2);


    t1.played++;
    t2.played++;


    t1.gf += s1;
    t1.ga += s2;

    t2.gf += s2;
    t2.ga += s1;


    if (s1 > s2) {

      t1.wins++;
      t1.points += 3;

      t2.losses++;

    }

    else if (s1 < s2) {

      t2.wins++;
      t2.points += 3;

      t1.losses++;

    }

    else {

      t1.draws++;
      t2.draws++;

      t1.points++;
      t2.points++;

    }

  });


  Object.values(stats)
    .forEach(team => {

      team.gd =
        team.gf - team.ga;

    });


  const sorted =
    Object.values(stats)
      .sort((a, b) => {

        if (b.points !== a.points)
          return b.points - a.points;

        if (b.gd !== a.gd)
          return b.gd - a.gd;

        return b.gf - a.gf;

      });


  $("leagueTable").innerHTML =
    sorted.map((team, index) => {

      const teamData =
        teams.find(
          item => item.name === team.name
        );


      let logoHTML;


      if (teamData && teamData.logo) {

        logoHTML = `
          <img
            class="team-logo"
            src="${escapeHTML(teamData.logo)}"
            alt="${escapeHTML(team.name)}"
            onerror="this.style.display='none'"
          >
        `;

      }

      else {

        logoHTML = `
          <div class="team-logo team-logo-placeholder">
            ⚽
          </div>
        `;

      }


      return `

        <tr>

          <td>
            ${index + 1}
          </td>


          <td>

            <div class="team-cell">

              ${logoHTML}

              <button
                class="team-name-btn"
                data-team="${escapeHTML(team.name)}"
              >
                ${escapeHTML(team.name)}
              </button>

            </div>

          </td>


          <td>${team.played}</td>

          <td>${team.wins}</td>

          <td>${team.draws}</td>

          <td>${team.losses}</td>

          <td>
            ${team.gd > 0 ? "+" : ""}
            ${team.gd}
          </td>

          <td>
            <strong>${team.points}</strong>
          </td>


          <td>
            ${renderFormDots(
              getTeamForm(team.name)
            )}
          </td>

        </tr>

      `;

    }).join("");


  document
    .querySelectorAll(".team-name-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          showTeamDetail(
            button.dataset.team
          );

        }
      );

    });

}


/* =========================
   FORM
========================= */

function getTeamForm(teamName) {
  return matches
    .filter(match =>
      match.team1 === teamName ||
      match.team2 === teamName
    )
    .sort(
      (a, b) =>
        Number(a.id) - Number(b.id)
    )
    .slice(-5)
    .map(match => {

      const isTeam1 =
        match.team1 === teamName;

      const forScore =
        isTeam1
          ? Number(match.score1)
          : Number(match.score2);

      const againstScore =
        isTeam1
          ? Number(match.score2)
          : Number(match.score1);

      if (forScore > againstScore)
        return "W";

      if (forScore < againstScore)
        return "L";

      return "D";
    });
}


function renderFormDots(form) {
  if (!form || form.length === 0) {
    return `<span class="form-empty">-</span>`;
  }

  return form.map(result => {
    let letter = "";
    let className = "";

    if (result === "W") {
      letter = "M"; // Menang
      className = "win";
    } else if (result === "D") {
      letter = "S"; // Seri
      className = "draw";
    } else if (result === "L") {
      letter = "L"; // Kalah
      className = "loss";
    }

    return `<span class="form-dot ${className}">${letter}</span>`;
  }).join("");
}

  if (!form.length) {

    return `
      <span class="form-dot">
        -
      </span>
    `;

  }

  return `
    <div class="form-dots">
      }).join("")}

}


/* =========================
   TEAM DETAIL
========================= */

function showTeamDetail(teamName) {

  selectedTeam = teamName;

  $("teamDetail").classList.remove(
    "hidden"
  );

  renderSelectedTeamDetail();


  $("teamDetail").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


function renderSelectedTeamDetail() {

  if (!selectedTeam) return;


  const team =
    teams.find(
      item => item.name === selectedTeam
    );


  if (!team) return;


  $("teamDetailName").textContent =
    team.name;


  /* LOGO */

  if (team.logo) {

    $("teamDetailLogo").innerHTML = `

      <img
        class="team-detail-logo"
        src="${escapeHTML(team.logo)}"
        alt="${escapeHTML(team.name)}"
      >

    `;

  }

  else {

    $("teamDetailLogo").innerHTML = `

      <div class="team-detail-placeholder">
        ⚽
      </div>

    `;

  }


  const stats =
    calculateTeamStats(
      selectedTeam
    );


  $("teamDetailSummary").textContent =
    `${stats.played} pertandingan • ${stats.points} poin`;


  $("teamStatsBoxes").innerHTML = `

    <div class="stat-box">
      <strong>${stats.played}</strong>
      <span>MP</span>
    </div>

    <div class="stat-box">
      <strong>${stats.wins}</strong>
      <span>MENANG</span>
    </div>

    <div class="stat-box">
      <strong>${stats.draws}</strong>
      <span>SERI</span>
    </div>

    <div class="stat-box">
      <strong>${stats.losses}</strong>
      <span>KALAH</span>
    </div>

    <div class="stat-box">
      <strong>${stats.points}</strong>
      <span>POIN</span>
    </div>

  `;


  const form =
    getTeamForm(selectedTeam);


  $("teamDetailForm").innerHTML =
    form.length
      ? renderFormDots(form)
      : `<span>-</span>`;


  /* SCHEDULE */

  const teamFixtures =
    fixtures.filter(fixture =>
      fixture.team1 === selectedTeam ||
      fixture.team2 === selectedTeam
    );


  const upcoming =
    teamFixtures.filter(
      fixture => fixture.status !== "PLAYED"
    );


  if (!upcoming.length) {

    $("teamDetailFixtures").innerHTML =
      `<div class="empty">
        Tidak ada jadwal tersisa.
      </div>`;

  }

  else {

    $("teamDetailFixtures").innerHTML =
      upcoming.map(fixture => {

        const opponent =
          fixture.team1 === selectedTeam
            ? fixture.team2
            : fixture.team1;


        return `

          <div class="match-item">

            <span>
              Matchday ${fixture.matchday}
            </span>

            <strong>
              vs ${escapeHTML(opponent)}
            </strong>

          </div>

        `;

      }).join("");

  }


  /* RESULTS */

  const teamMatches =
    matches.filter(match =>
      match.team1 === selectedTeam ||
      match.team2 === selectedTeam
    ).reverse();


  if (!teamMatches.length) {

    $("teamDetailResults").innerHTML =
      `<div class="empty">
        Belum ada hasil.
      </div>`;

  }

  else {

    $("teamDetailResults").innerHTML =
      teamMatches.map(match => {

        return `

          <div class="match-item">

            <span>

              ${escapeHTML(match.team1)}
              vs
              ${escapeHTML(match.team2)}

            </span>

            <span class="match-score">

              ${match.score1}
              -
              ${match.score2}

            </span>

          </div>

        `;

      }).join("");

  }

}


/* =========================
   TEAM STATS
========================= */

function calculateTeamStats(teamName) {

  const stats = {

    played: 0,

    wins: 0,

    draws: 0,

    losses: 0,

    points: 0

  };


  matches.forEach(match => {

    if (
      match.team1 !== teamName &&
      match.team2 !== teamName
    ) return;


    stats.played++;


    const isTeam1 =
      match.team1 === teamName;


    const ownScore =
      isTeam1
        ? Number(match.score1)
        : Number(match.score2);


    const opponentScore =
      isTeam1
        ? Number(match.score2)
        : Number(match.score1);


    if (ownScore > opponentScore) {

      stats.wins++;
      stats.points += 3;

    }

    else if (
      ownScore === opponentScore
    ) {

      stats.draws++;
      stats.points++;

    }

    else {

      stats.losses++;

    }

  });


  return stats;

}


/* =========================
   CLOSE DETAIL
========================= */

$("closeTeamDetail").addEventListener(
  "click",
  () => {

    selectedTeam = null;

    $("teamDetail")
      .classList.add("hidden");

  }
);


/* =========================
   AUTH
========================= */

async function checkSession() {

  const {
    data: {
      session
    }
  } = await supabaseClient.auth.getSession();


  if (session) {

    showAdminPanel(session);

  }

  else {

    showLogin();

  }

}


function showLogin() {

  $("loginBox")
    .classList.remove("hidden");

  $("adminPanel")
    .classList.add("hidden");

}


function showAdminPanel(session) {

  $("loginBox")
    .classList.add("hidden");

  $("adminPanel")
    .classList.remove("hidden");

}


/* =========================
   LOGIN
========================= */

async function login() {

  const email =
    $("loginEmail").value.trim();

  const password =
    $("loginPassword").value;


  const {
    data,
    error
  } =
    await supabaseClient.auth
      .signInWithPassword({
        email,
        password
      });


  if (error) {

    $("loginMessage").textContent =
      error.message;

    return;

  }


  if (
    ADMIN_UUID !== "16544963-125c-4369-a8f3-2d8c9091679f" &&
    data.user.id !== ADMIN_UUID
  ) {

    await supabaseClient.auth.signOut();

    $("loginMessage").textContent =
      "Akun ini bukan admin.";

    return;

  }


  $("loginMessage").textContent =
    "Login berhasil.";


  showAdminPanel(data.session);

}


$("loginBtn").addEventListener(
  "click",
  login
);


/* =========================
   LOGOUT
========================= */

async function logout() {

  await supabaseClient.auth.signOut();

  showLogin();

}


$("logoutBtn").addEventListener(
  "click",
  logout
);


/* =========================
   INITIALIZE
========================= */

async function init() {

  await loadTeams();

  await loadFixtures();

  await loadMatches();

  await checkSession();

}


init();
