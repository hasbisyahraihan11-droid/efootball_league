const SUPABASE_URL = "https://jrhgxphgvahlrodjtjzs.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_SuCUxQSZRQGr_GsS1TCy5Q_ItEUJB4d";

let supabaseClient = null;

try {
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );
} catch (error) {
  console.error("Supabase gagal dibuat:", error);
}


/* =========================
   DATA
========================= */

let teams = [];
let fixtures = [];
let matches = [];

let currentFixture = 0;


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

  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === page
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
   TEAMS
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


function renderTeamList() {
  const container =
    document.getElementById("teamAdminList");

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


function populateTeamSelects() {
  const select1 =
    document.getElementById("matchTeam1Select");

  const select2 =
    document.getElementById("matchTeam2Select");

  if (!select1 || !select2) return;

  select1.innerHTML =
    `<option value="">Pilih tim 1</option>`;

  select2.innerHTML =
    `<option value="">Pilih tim 2</option>`;

  teams.forEach(team => {

    select1.innerHTML += `
      <option value="${escapeAttribute(team.name)}">
        ${escapeHTML(team.name)}
      </option>
    `;

    select2.innerHTML += `
      <option value="${escapeAttribute(team.name)}">
        ${escapeHTML(team.name)}
      </option>
    `;
  });
}


async function addTeam() {
  const input =
    document.getElementById("teamNameInput");

  const message =
    document.getElementById("teamMessage");

  const name = input.value.trim();

  if (!name) {
    message.textContent = "Masukkan nama tim.";
    return;
  }

  const alreadyExists = teams.some(
    team =>
      team.name.toLowerCase() === name.toLowerCase()
  );

  if (alreadyExists) {
    message.textContent = "Tim tersebut sudah ada.";
    return;
  }

  const { error } =
    await supabaseClient
      .from("teams")
      .insert({
        name: name
      });

  if (error) {
    console.error(error);
    message.textContent =
      "Gagal menambahkan tim.";
    return;
  }

  input.value = "";

  message.textContent =
    "Tim berhasil ditambahkan.";

  await loadTeams();
}


/* =========================
   GENERATE JADWAL
========================= */

async function generateFixtures() {

  const message =
    document.getElementById("fixtureMessage");

  if (teams.length < 2) {
    message.textContent =
      "Minimal 2 tim.";
    return;
  }


  // Cek apakah sudah ada jadwal
  if (fixtures.length > 0) {

    const yakin = confirm(
      "Jadwal sudah ada. Generate ulang?"
    );

    if (!yakin) return;

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
    ROUND ROBIN

    Contoh 4 tim:

    MD 1
    A vs B
    C vs D

    MD 2
    A vs C
    D vs B

    MD 3
    A vs D
    B vs C
  */


  let list =
    teams.map(team => team.name);

  // Kalau jumlah ganjil,
  // tambahkan BYE
  if (list.length % 2 !== 0) {
    list.push("BYE");
  }


  const jumlahTim = list.length;
  const jumlahMatchday = jumlahTim - 1;
  const jumlahPertandingan =
    jumlahTim / 2;

  const generated = [];


  for (
    let round = 0;
    round < jumlahMatchday;
    round++
  ) {

    for (
      let i = 0;
      i < jumlahPertandingan;
      i++
    ) {

      const team1 = list[i];

      const team2 =
        list[jumlahTim - 1 - i];


      // Lewati BYE
      if (
        team1 === "BYE" ||
        team2 === "BYE"
      ) {
        continue;
      }


      generated.push({
        team1: team1,
        team2: team2,
        matchday: round + 1,
        status: "UPCOMING"
      });
    }


    // Rotasi tim untuk round berikutnya
    const first = list[0];

    const rest = list.slice(1);

    const last = rest.pop();

    rest.unshift(last);

    list = [
      first,
      ...rest
    ];
  }


  if (generated.length === 0) {
    message.textContent =
      "Gagal membuat jadwal.";

    return;
  }


  const { error } =
    await supabaseClient
      .from("fixtures")
      .insert(generated);


  if (error) {
    console.error(error);

    message.textContent =
      "Gagal menyimpan jadwal.";

    return;
  }


  message.textContent =
    `${generated.length} pertandingan berhasil dibuat.`;

  currentFixture = 0;

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
  updateStats();
}


/*
  HANYA fixture UPCOMING
  yang ditampilkan sebagai
  jadwal mendatang.
*/

function getUpcomingFixtures() {
  return fixtures.filter(
    fixture =>
      fixture.status === "UPCOMING"
  );
}


function renderUpcoming() {

  const container =
    document.getElementById("upcomingList");

  if (!container) return;

  const upcoming =
    getUpcomingFixtures();


  if (upcoming.length === 0) {

    container.innerHTML = `
      <p>Tidak ada pertandingan mendatang.</p>
    `;

    return;
  }


  container.innerHTML =
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


  const team1 =
    document.getElementById("fixtureTeam1");

  const team2 =
    document.getElementById("fixtureTeam2");

  const matchday =
    document.getElementById("fixtureMatchday");

  const date =
    document.getElementById("fixtureDate");

  const dots =
    document.getElementById("fixtureDots");


  if (upcoming.length === 0) {

    team1.textContent = "-";
    team2.textContent = "-";

    matchday.textContent =
      "Tidak ada pertandingan";

    date.textContent = "";

    dots.innerHTML = "";

    return;
  }


  if (
    currentFixture >= upcoming.length
  ) {
    currentFixture = 0;
  }


  const fixture =
    upcoming[currentFixture];


  team1.textContent =
    fixture.team1;

  team2.textContent =
    fixture.team2;

  matchday.textContent =
    `MATCHDAY ${fixture.matchday}`;


  if (fixture.scheduled_at) {

    date.textContent =
      formatDate(
        fixture.scheduled_at
      );

  } else {

    date.textContent =
      "Jadwal pertandingan";
  }


  dots.innerHTML =
    upcoming.map((_, index) => `
      <span class="${
        index === currentFixture
          ? "active"
          : ""
      }"></span>
    `).join("");
}


/* =========================
   SLIDER
========================= */

document
  .getElementById("prevFixture")
  .addEventListener("click", () => {

    const upcoming =
      getUpcomingFixtures();

    if (upcoming.length === 0) return;

    currentFixture--;

    if (currentFixture < 0) {
      currentFixture =
        upcoming.length - 1;
    }

    renderHomeFixture();
  });


document
  .getElementById("nextFixture")
  .addEventListener("click", () => {

    const upcoming =
      getUpcomingFixtures();

    if (upcoming.length === 0) return;

    currentFixture++;

    if (
      currentFixture >=
      upcoming.length
    ) {
      currentFixture = 0;
    }

    renderHomeFixture();
  });


/* AUTO ROLL 5 DETIK */

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
   MATCHES / RESULTS
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
  updateStats();
}


function renderMatches() {

  const container =
    document.getElementById("matchList");

  if (!container) return;


  if (matches.length === 0) {

    container.innerHTML =
      `<p>Belum ada hasil pertandingan.</p>`;

    return;
  }


  container.innerHTML =
    matches.map(match => {

      let class1 = "";
      let class2 = "";

      if (
        match.score1 >
        match.score2
      ) {
        class1 = "win";
        class2 = "loss";
      }

      else if (
        match.score1 <
        match.score2
      ) {
        class1 = "loss";
        class2 = "win";
      }

      else {
        class1 = "draw";
        class2 = "draw";
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
   INPUT HASIL
========================= */

async function addMatch() {

  const team1 =
    document.getElementById(
      "matchTeam1Select"
    ).value;

  const team2 =
    document.getElementById(
      "matchTeam2Select"
    ).value;

  const score1Input =
    document.getElementById(
      "matchScore1"
    );

  const score2Input =
    document.getElementById(
      "matchScore2"
    );

  const message =
    document.getElementById(
      "matchMessage"
    );


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
    score1Input.value === "" ||
    score2Input.value === ""
  ) {

    message.textContent =
      "Masukkan skor.";

    return;
  }


  const score1 =
    Number(score1Input.value);

  const score2 =
    Number(score2Input.value);


  if (
    score1 < 0 ||
    score2 < 0
  ) {

    message.textContent =
      "Skor tidak valid.";

    return;
  }


  /*
    CEK APAKAH PERTANDINGAN
    MEMANG ADA DI JADWAL.
  */

  const { data: fixture } =
    await supabaseClient
      .from("fixtures")
      .select("*")
      .eq("team1", team1)
      .eq("team2", team2)
      .eq("status", "UPCOMING")
      .limit(1)
      .maybeSingle();


  if (!fixture) {

    message.textContent =
      "Pertandingan tersebut tidak ditemukan di jadwal.";

    return;
  }


  /*
    SIMPAN HASIL
  */

  const { error: matchError } =
    await supabaseClient
      .from("matches")
      .insert({
        team1: team1,
        score1: score1,
        score2: score2,
        team2: team2,
        status: "FT"
      });


  if (matchError) {

    console.error(matchError);

    message.textContent =
      "Gagal menyimpan hasil.";

    return;
  }


  /*
    PENTING:
    FIXTURE LANGSUNG DIUBAH
    MENJADI PLAYED.

    Karena tampilan Home dan
    Upcoming hanya mengambil
    status UPCOMING, pertandingan
    ini otomatis hilang.
  */

  const { error: updateError } =
    await supabaseClient
      .from("fixtures")
      .update({
        status: "PLAYED"
      })
      .eq("id", fixture.id);


  if (updateError) {
    console.error(updateError);
  }


  score1Input.value = "";
  score2Input.value = "";

  message.textContent =
    "Pertandingan selesai dan hasil berhasil disimpan.";


  currentFixture = 0;

  await loadMatches();
  await loadFixtures();
}


/* =========================
   KLASEMEN
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
      table[match.team1] =
        createTeamStats(match.team1);
    }

    if (!table[match.team2]) {
      table[match.team2] =
        createTeamStats(match.team2);
    }


    const a =
      table[match.team1];

    const b =
      table[match.team2];


    a.mp++;
    b.mp++;


    a.gf += Number(match.score1);
    a.ga += Number(match.score2);

    b.gf += Number(match.score2);
    b.ga += Number(match.score1);


    if (
      match.score1 >
      match.score2
    ) {

      a.w++;
      a.pts += 3;
      b.l++;

    }

    else if (
      match.score1 <
      match.score2
    ) {

      b.w++;
      b.pts += 3;
      a.l++;

    }

    else {

      a.d++;
      b.d++;

      a.pts++;
      b.pts++;
    }

  });


  Object.values(table).forEach(team => {

    team.gd =
      team.gf - team.ga;

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
    document.getElementById(
      "leagueTable"
    );


  tbody.innerHTML =
    sorted.map((team, index) => `

      <tr>

        <td>${index + 1}</td>

        <td>
          ${escapeHTML(team.team)}
        </td>

        <td>${team.mp}</td>
        <td>${team.w}</td>
        <td>${team.d}</td>
        <td>${team.l}</td>
        <td>${team.gd}</td>

        <td>
          <strong>${team.pts}</strong>
        </td>

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
   LOGIN
========================= */

async function checkLogin() {

  const {
    data: {
      session
    }
  } =
    await supabaseClient.auth.getSession();

  updateAdminUI(session);
}


function updateAdminUI(session) {

  const loginBox =
    document.getElementById(
      "loginBox"
    );

  const adminPanel =
    document.getElementById(
      "adminPanel"
    );


  if (session) {

    loginBox.style.display =
      "none";

    adminPanel.style.display =
      "block";

  }

  else {

    loginBox.style.display =
      "block";

    adminPanel.style.display =
      "none";
  }
}


async function login() {

  const email =
    document.getElementById(
      "loginEmail"
    ).value;

  const password =
    document.getElementById(
      "loginPassword"
    ).value;

  const message =
    document.getElementById(
      "loginMessage"
    );


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

    console.error(error);

    message.textContent =
      "Login gagal.";

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
    document.getElementById(
      "totalTeams"
    );

  const totalMatches =
    document.getElementById(
      "totalMatches"
    );

  const playedMatches =
    document.getElementById(
      "playedMatches"
    );


  if (totalTeams) {
    totalTeams.textContent =
      teams.length;
  }


  if (totalMatches) {

    totalMatches.textContent =
      fixtures.filter(
        fixture =>
          fixture.status === "UPCOMING"
      ).length;
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

  return new Date(date)
    .toLocaleString(
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


function escapeAttribute(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}


/* =========================
   BUTTONS
========================= */

document
  .getElementById("loginBtn")
  .addEventListener(
    "click",
    login
  );


document
  .getElementById("logoutBtn")
  .addEventListener(
    "click",
    logout
  );


document
  .getElementById("addTeamBtn")
  .addEventListener(
    "click",
    addTeam
  );


document
  .getElementById(
    "generateFixturesBtn"
  )
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
   ENTER = TAMBAH TIM
========================= */

document
  .getElementById("teamNameInput")
  .addEventListener("keydown", event => {

    if (event.key === "Enter") {
      addTeam();
    }

  });


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
   START
========================= */

async function init() {

  await loadTeams();

  await loadMatches();

  await loadFixtures();

  await checkLogin();

  calculateTable();

  updateStats();
}

init();
