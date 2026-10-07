const SUPABASE_URL =
  "https://jrhgxphgvahlrodjtjzs.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_SuCUxQSZRQGr_GsS1TCy5Q_ItEUJB4d";


const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


let teams = [];
let fixtures = [];
let matches = [];

let currentFixture = 0;


/* =========================
   HELPER
========================= */

const $ = id => document.getElementById(id);


function escapeHTML(value) {
  return String(value ?? "")
    .replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c]));
}


/* =========================
   NAVIGATION
========================= */

function showPage(page) {

  document.querySelectorAll(".page")
    .forEach(p => p.classList.remove("active"));

  document.querySelectorAll(".nav-btn")
    .forEach(b => b.classList.remove("active"));

  const target = $(page);

  if (target) {
    target.classList.add("active");
  }

  document.querySelectorAll(".nav-btn")
    .forEach(button => {

      if (button.dataset.page === page) {
        button.classList.add("active");
      }

    });
}


document.querySelectorAll(".nav-btn")
  .forEach(button => {

    button.addEventListener("click", () => {
      showPage(button.dataset.page);
    });

  });


/* =========================
   TEAMS
========================= */

async function loadTeams() {

  const { data, error } =
    await supabaseClient
      .from("teams")
      .select("*")
      .order("name", {
        ascending: true
      });

  if (error) {
    console.error(error);
    return;
  }

  teams = data || [];

  renderTeamList();
  calculateTable();
}


function renderTeamList() {

  const box = $("teamAdminList");

  if (!box) return;

  if (!teams.length) {

    box.innerHTML =
      "<p class='muted'>Belum ada tim.</p>";

    return;
  }

  box.innerHTML = teams
    .map((team, index) => `
      <div class="admin-team-item">
        ${index + 1}. ${escapeHTML(team.name)}
      </div>
    `)
    .join("");
}


async function addTeam() {

  const input = $("teamNameInput");
  const message = $("teamMessage");

  const name = input.value.trim();

  if (!name) {

    message.textContent =
      "Masukkan nama tim.";

    return;
  }


  const duplicate =
    teams.some(team =>
      team.name.toLowerCase() === name.toLowerCase()
    );


  if (duplicate) {

    message.textContent =
      "Tim tersebut sudah ada.";

    return;
  }


  const { error } =
    await supabaseClient
      .from("teams")
      .insert({
        name
      });


  if (error) {

    console.error(error);

    message.textContent =
      "Gagal menambahkan tim: " +
      error.message;

    return;
  }


  input.value = "";

  message.textContent =
    "Tim berhasil ditambahkan.";

  await loadTeams();
}


/* =========================
   GENERATE ROUND ROBIN
========================= */

function generateRoundRobin(names) {

  let list = [...names];

  if (list.length % 2 !== 0) {
    list.push(null);
  }

  const rounds = list.length - 1;
  const perRound = list.length / 2;

  const generated = [];


  for (let round = 0; round < rounds; round++) {

    for (let i = 0; i < perRound; i++) {

      const team1 = list[i];
      const team2 =
        list[list.length - 1 - i];


      if (team1 && team2) {

        generated.push({
          team1,
          team2,
          matchday: round + 1,
          status: "UPCOMING"
        });

      }

    }


    const fixed = list[0];

    const rest = list.slice(1);

    rest.unshift(rest.pop());

    list = [
      fixed,
      ...rest
    ];
  }


  return generated;
}


/* =========================
   GENERATE FIXTURES
========================= */

async function generateFixtures() {

  const message =
    $("fixtureMessage");

  message.textContent =
    "Membuat jadwal...";


  if (teams.length < 2) {

    message.textContent =
      "Minimal 2 tim.";

    return;
  }


  const {
    data: existing,
    error: checkError
  } =
    await supabaseClient
      .from("fixtures")
      .select("id")
      .limit(1);


  if (checkError) {

    message.textContent =
      "Gagal mengecek jadwal: " +
      checkError.message;

    return;
  }


  if (existing && existing.length) {

    message.textContent =
      "Jadwal sudah tersedia.";

    await loadFixtures();

    return;
  }


  const generated =
    generateRoundRobin(
      teams.map(team => team.name)
    );


  const { error } =
    await supabaseClient
      .from("fixtures")
      .insert(generated);


  if (error) {

    console.error(error);

    message.textContent =
      "Gagal membuat jadwal: " +
      error.message;

    return;
  }


  message.textContent =
    `${generated.length} pertandingan berhasil dibuat.`;


  await loadFixtures();
}


/* =========================
   FIXTURES
========================= */

async function loadFixtures() {

  const { data, error } =
    await supabaseClient
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
  renderFixtureSelector();

  renderSelectedTeamDetail();
}


function getUpcomingFixtures() {

  return fixtures.filter(
    fixture =>
      fixture.status === "UPCOMING"
  );
}


/* =========================
   UPCOMING LIST
========================= */

function renderUpcoming() {

  const box = $("upcomingList");

  if (!box) return;


  const upcoming =
    getUpcomingFixtures();


  if (!upcoming.length) {

    box.innerHTML =
      "<p class='muted'>Tidak ada pertandingan mendatang.</p>";

    return;
  }


  box.innerHTML =
    upcoming.map(fixture => `

      <div class="match-card">

        <small>
          MATCHDAY ${fixture.matchday}
        </small>

        <div class="match-teams">

          <span>
            ${escapeHTML(fixture.team1)}
          </span>

          <strong>VS</strong>

          <span>
            ${escapeHTML(fixture.team2)}
          </span>

        </div>

      </div>

    `).join("");
}


/* =========================
   HOME FIXTURE
========================= */

function renderHomeFixture() {

  const upcoming =
    getUpcomingFixtures();


  if (!$("fixtureTeam1")) return;


  if (!upcoming.length) {

    $("fixtureTeam1").textContent = "-";
    $("fixtureTeam2").textContent = "-";

    $("fixtureMatchday").textContent =
      "Belum ada jadwal";

    $("fixtureDate").textContent = "";

    return;
  }


  if (
    currentFixture >= upcoming.length
  ) {
    currentFixture = 0;
  }


  const fixture =
    upcoming[currentFixture];


  $("fixtureTeam1").textContent =
    fixture.team1;

  $("fixtureTeam2").textContent =
    fixture.team2;

  $("fixtureMatchday").textContent =
    `MATCHDAY ${fixture.matchday}`;

  $("fixtureDate").textContent =
    "Jadwal pertandingan";
}


/* =========================
   ARROWS
========================= */

$("prevFixture")
  .addEventListener("click", () => {

    const upcoming =
      getUpcomingFixtures();

    if (!upcoming.length) return;

    currentFixture--;

    if (currentFixture < 0) {
      currentFixture =
        upcoming.length - 1;
    }

    renderHomeFixture();
  });


$("nextFixture")
  .addEventListener("click", () => {

    const upcoming =
      getUpcomingFixtures();

    if (!upcoming.length) return;

    currentFixture++;

    if (
      currentFixture >=
      upcoming.length
    ) {
      currentFixture = 0;
    }

    renderHomeFixture();
  });


/* AUTO SLIDE */

setInterval(() => {

  const upcoming =
    getUpcomingFixtures();

  if (upcoming.length <= 1) return;

  currentFixture++;

  if (
    currentFixture >=
    upcoming.length
  ) {
    currentFixture = 0;
  }

  renderHomeFixture();

}, 5000);


/* =========================
   ADMIN FIXTURE SELECTOR
========================= */

function renderFixtureSelector() {

  const select =
    $("matchTeam1Select");

  if (!select) return;


  select.innerHTML =
    `<option value="">Pilih pertandingan</option>`;


  getUpcomingFixtures()
    .forEach(fixture => {

      const option =
        document.createElement("option");

      option.value =
        fixture.id;

      option.textContent =
        `MD ${fixture.matchday} — ${fixture.team1} vs ${fixture.team2}`;

      select.appendChild(option);

    });
}


/* =========================
   ADD MATCH RESULT
========================= */

async function addMatch() {

  const fixtureId =
    $("matchTeam1Select").value;

  const score1 =
    Number($("matchScore1").value);

  const score2 =
    Number($("matchScore2").value);

  const message =
    $("matchMessage");


  if (!fixtureId) {

    message.textContent =
      "Pilih pertandingan.";

    return;
  }


  if (
    !Number.isInteger(score1) ||
    !Number.isInteger(score2) ||
    score1 < 0 ||
    score2 < 0
  ) {

    message.textContent =
      "Masukkan skor yang valid.";

    return;
  }


  const fixture =
    fixtures.find(
      f =>
        String(f.id) ===
        String(fixtureId)
    );


  if (
    !fixture ||
    fixture.status !== "UPCOMING"
  ) {

    message.textContent =
      "Pertandingan tidak tersedia.";

    return;
  }


  const {
    error: matchError
  } =
    await supabaseClient
      .from("matches")
      .insert({

        team1: fixture.team1,

        score1,

        score2,

        team2: fixture.team2,

        status: "FT"

      });


  if (matchError) {

    console.error(matchError);

    message.textContent =
      "Gagal menyimpan hasil: " +
      matchError.message;

    return;
  }


  const {
    error: updateError
  } =
    await supabaseClient
      .from("fixtures")
      .update({
        status: "PLAYED"
      })
      .eq("id", fixture.id);


  if (updateError) {

    console.error(updateError);

    message.textContent =
      "Hasil tersimpan, tetapi status jadwal gagal diperbarui.";

    return;
  }


  $("matchScore1").value = "";
  $("matchScore2").value = "";

  $("matchTeam1Select").value = "";


  message.textContent =
    "Hasil berhasil disimpan.";


  await loadFixtures();
  await loadMatches();
}


/* =========================
   LOAD MATCHES
========================= */

async function loadMatches() {

  const { data, error } =
    await supabaseClient
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

  renderSelectedTeamDetail();
}


/* =========================
   RESULT LIST
========================= */

function renderMatches() {

  const box =
    $("matchList");

  if (!box) return;


  if (!matches.length) {

    box.innerHTML =
      "<p class='muted'>Belum ada hasil pertandingan.</p>";

    return;
  }


  box.innerHTML =
    matches.map(match => {

      let class1 = "draw";
      let class2 = "draw";


      if (
        match.score1 >
        match.score2
      ) {

        class1 = "win";
        class2 = "loss";

      }


      if (
        match.score2 >
        match.score1
      ) {

        class1 = "loss";
        class2 = "win";

      }


      return `

        <div class="match-card">

          <small>
            ${escapeHTML(match.status)}
          </small>

          <div class="match-teams">

            <span class="${class1}">
              ${escapeHTML(match.team1)}
            </span>

            <strong>
              ${match.score1} - ${match.score2}
            </strong>

            <span class="${class2}">
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

function createStats(name) {

  return {
    name,
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


function calculateTable() {

  const table = {};


  teams.forEach(team => {

    table[team.name] =
      createStats(team.name);

  });


  matches.forEach(match => {

    if (!table[match.team1]) {

      table[match.team1] =
        createStats(match.team1);

    }


    if (!table[match.team2]) {

      table[match.team2] =
        createStats(match.team2);

    }


    const team1 =
      table[match.team1];

    const team2 =
      table[match.team2];


    const score1 =
      Number(match.score1);

    const score2 =
      Number(match.score2);


    team1.mp++;
    team2.mp++;


    team1.gf += score1;
    team1.ga += score2;


    team2.gf += score2;
    team2.ga += score1;


    if (score1 > score2) {

      team1.w++;
      team1.pts += 3;

      team2.l++;

    }

    else if (score2 > score1) {

      team2.w++;
      team2.pts += 3;

      team1.l++;

    }

    else {

      team1.d++;
      team2.d++;

      team1.pts++;
      team2.pts++;

    }

  });


  Object.values(table)
    .forEach(team => {

      team.gd =
        team.gf - team.ga;

    });


  const sorted =
    Object.values(table)
      .sort((a, b) =>

        b.pts - a.pts ||

        b.gd - a.gd ||

        b.gf - a.gf ||

        a.name.localeCompare(b.name)

      );


  const body =
    $("leagueTable");


  if (!body) return;


  body.innerHTML =
    sorted.map((team, index) => {

      const form =
        getTeamForm(team.name);


      return `

        <tr>

          <td>
            ${index + 1}
          </td>

          <td>

            <button
              class="team-name-btn"
              data-team="${escapeHTML(team.name)}"
            >
              ${escapeHTML(team.name)}
            </button>

          </td>

          <td>${team.mp}</td>

          <td>${team.w}</td>

          <td>${team.d}</td>

          <td>${team.l}</td>

          <td>
            ${team.gd > 0 ? "+" : ""}
            ${team.gd}
          </td>

          <td>
            <strong>
              ${team.pts}
            </strong>
          </td>

          <td>

            <div class="form-dots">

              ${renderFormDots(form)}

            </div>

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
   TEAM FORM
========================= */

function getTeamForm(teamName) {

  return matches

    .filter(match =>
      match.team1 === teamName ||
      match.team2 === teamName
    )

    .sort(
      (a, b) =>
        Number(a.id) -
        Number(b.id)
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


      if (
        forScore >
        againstScore
      ) {
        return "W";
      }


      if (
        forScore <
        againstScore
      ) {
        return "L";
      }


      return "D";

    });

}


function renderFormDots(form) {

  if (!form.length) {

    return `<span class="muted">-</span>`;

  }


  return form
    .map(result => {

      if (result === "W") {

        return `
          <span
            class="form-dot form-win"
            title="Menang"
          >
            🟢
          </span>
        `;

      }


      if (result === "D") {

        return `
          <span
            class="form-dot form-draw"
            title="Seri"
          >
            🟡
          </span>
        `;

      }


      return `
        <span
          class="form-dot form-loss"
          title="Kalah"
        >
          🔴
        </span>
      `;

    })
    .join("");

}


/* =========================
   TEAM DETAIL
========================= */

let selectedTeamName = null;


function showTeamDetail(teamName) {

  selectedTeamName =
    teamName;


  const detail =
    $("teamDetail");


  if (!detail) return;


  detail.classList.remove("hidden");


  $("teamDetailName")
    .textContent =
    teamName;


  renderTeamDetail();


  detail.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


function renderSelectedTeamDetail() {

  if (!selectedTeamName) return;

  const detail =
    $("teamDetail");

  if (!detail) return;

  if (
    detail.classList.contains("hidden")
  ) {
    return;
  }

  renderTeamDetail();

}


function renderTeamDetail() {

  const teamName =
    selectedTeamName;

  if (!teamName) return;


  $("teamDetailName")
    .textContent =
    teamName;


  /* STATISTIK */

  const stats =
    calculateTeamStats(teamName);


  $("teamDetailSummary").innerHTML = `

    <div class="stat-box">
      <small>MP</small>
      <strong>${stats.mp}</strong>
    </div>

    <div class="stat-box">
      <small>W</small>
      <strong>${stats.w}</strong>
    </div>

    <div class="stat-box">
      <small>D</small>
      <strong>${stats.d}</strong>
    </div>

    <div class="stat-box">
      <small>L</small>
      <strong>${stats.l}</strong>
    </div>

    <div class="stat-box">
      <small>GF</small>
      <strong>${stats.gf}</strong>
    </div>

    <div class="stat-box">
      <small>GA</small>
      <strong>${stats.ga}</strong>
    </div>

    <div class="stat-box">
      <small>GD</small>
      <strong>
        ${stats.gd > 0 ? "+" : ""}
        ${stats.gd}
      </strong>
    </div>

    <div class="stat-box">
      <small>PTS</small>
      <strong>${stats.pts}</strong>
    </div>

  `;


  /* FORM */

  const form =
    getTeamForm(teamName);


  $("teamDetailForm").innerHTML =
    form.length
      ? renderBigForm(form)
      : `<span class="muted">Belum ada pertandingan.</span>`;


  /* JADWAL */

  const teamFixtures =
    fixtures.filter(fixture =>
      fixture.status === "UPCOMING" &&
      (
        fixture.team1 === teamName ||
        fixture.team2 === teamName
      )
    );


  if (!teamFixtures.length) {

    $("teamDetailFixtures").innerHTML =
      `<p class="muted">Tidak ada jadwal mendatang.</p>`;

  }

  else {

    $("teamDetailFixtures").innerHTML =
      teamFixtures.map(fixture => `

        <div class="match-card">

          <small>
            MATCHDAY ${fixture.matchday}
          </small>

          <div class="match-teams">

            <span>
              ${escapeHTML(fixture.team1)}
            </span>

            <strong>VS</strong>

            <span>
              ${escapeHTML(fixture.team2)}
            </span>

          </div>

        </div>

      `).join("");

  }


  /* HASIL */

  const teamMatches =
    matches.filter(match =>
      match.team1 === teamName ||
      match.team2 === teamName
    );


  if (!teamMatches.length) {

    $("teamDetailResults").innerHTML =
      `<p class="muted">Belum ada hasil pertandingan.</p>`;

  }

  else {

    $("teamDetailResults").innerHTML =
      teamMatches.map(match => {

        const isTeam1 =
          match.team1 === teamName;


        const myScore =
          isTeam1
            ? Number(match.score1)
            : Number(match.score2);


        const opponentScore =
          isTeam1
            ? Number(match.score2)
            : Number(match.score1);


        let resultClass =
          "draw";


        if (
          myScore >
          opponentScore
        ) {
          resultClass = "win";
        }


        if (
          myScore <
          opponentScore
        ) {
          resultClass = "loss";
        }


        return `

          <div class="match-card">

            <small>
              ${escapeHTML(match.status)}
          
