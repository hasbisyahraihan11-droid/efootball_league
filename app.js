// =====================================================
// SUPABASE CONFIG
// =====================================================

const SUPABASE_URL =
  "https://jrhgxphgvahlrodjtjzs.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_SuCUxQSZRQGr_GsS1TCy5Q_ItEUJB4d";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


// =====================================================
// GLOBAL DATA
// =====================================================

let allMatches = [];
let allFixtures = [];

let currentFixtureIndex = 0;
let fixtureTimer = null;


// =====================================================
// PAGE NAVIGATION
// =====================================================

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

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (pageName === "table") {
    loadLeagueTable();
  }

  if (pageName === "matches") {
    loadMatches();
    loadFixtures();
  }
}


// =====================================================
// GET FINISHED MATCHES
// =====================================================

async function getMatches() {

  const { data, error } = await supabaseClient
    .from("matches")
    .select("*")
    .eq("status", "FT")
    .order("created_at", {
      ascending: true
    })
    .order("id", {
      ascending: true
    });

  if (error) {

    console.error("Gagal mengambil matches:", error);

    return [];

  }

  return data || [];
}


// =====================================================
// GET FIXTURES
// =====================================================

async function getFixtures() {

  const { data, error } = await supabaseClient
    .from("fixtures")
    .select("*")
    .eq("status", "UPCOMING")
    .order("scheduled_at", {
      ascending: true,
      nullsFirst: false
    })
    .order("id", {
      ascending: true
    });

  if (error) {

    console.error("Gagal mengambil fixtures:", error);

    return [];

  }

  return data || [];
}


// =====================================================
// CALCULATE LEAGUE TABLE
// =====================================================

function calculateTable(matches) {

  const teams = {};

  function createTeam(name) {

    const cleanName = String(name || "").trim();

    if (!cleanName) return null;

    if (!teams[cleanName]) {

      teams[cleanName] = {
        name: cleanName,
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

    return teams[cleanName];
  }


  matches.forEach(match => {

    const team1 = createTeam(match.team1);
    const team2 = createTeam(match.team2);

    if (!team1 || !team2) return;

    const score1 = Number(match.score1);
    const score2 = Number(match.score2);


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

      team1.form.push("W");
      team2.form.push("L");

    }

    else if (score1 < score2) {

      team2.w++;
      team2.pts += 3;

      team1.l++;

      team1.form.push("L");
      team2.form.push("W");

    }

    else {

      team1.d++;
      team2.d++;

      team1.pts++;
      team2.pts++;

      team1.form.push("D");
      team2.form.push("D");

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


// =====================================================
// FORM 5 MATCH TERAKHIR
// =====================================================

function renderForm(form) {

  const recent = form
    .slice(-5)
    .reverse();


  if (!recent.length) {

    return `<span class="no-form">—</span>`;

  }


  return `
    <div class="form">
      ${recent.map(result => {

        let className = "loss";

        if (result === "W") {
          className = "win";
        }

        if (result === "D") {
          className = "draw";
        }

        return `
          <span
            class="form-dot ${className}"
            title="${result === "W"
              ? "Menang"
              : result === "D"
                ? "Seri"
                : "Kalah"}"
          >
            ${result}
          </span>
        `;

      }).join("")}
    </div>
  `;

}


// =====================================================
// LOAD KLASEMEN
// =====================================================

async function loadLeagueTable() {

  const table = document.getElementById("leagueTable");

  if (!table) return;


  const matches = await getMatches();

  allMatches = matches;


  const teams = calculateTable(matches);


  if (!teams.length) {

    table.innerHTML = `
      <tr>
        <td colspan="11">
          Belum ada data pertandingan.
        </td>
      </tr>
    `;

    return;

  }


  table.innerHTML = teams.map((team, index) => {

    return `
      <tr>

        <td>
          <strong>${index + 1}</strong>
        </td>

        <td>
          <div class="team-name">

            <span class="team-mini-logo">
              ⚽
            </span>

            <span>
              ${escapeHTML(team.name)}
            </span>

          </div>
        </td>

        <td>
          ${renderForm(team.form)}
        </td>

        <td>${team.mp}</td>

        <td>${team.w}</td>

        <td>${team.d}</td>

        <td>${team.l}</td>

        <td>${team.gf}</td>

        <td>${team.ga}</td>

        <td>${team.gd}</td>

        <td>
          <span class="pts">
            ${team.pts}
          </span>
        </td>

      </tr>
    `;

  }).join("");

}


// =====================================================
// LOAD FINISHED MATCHES
// =====================================================

async function loadMatches() {

  const list = document.getElementById("matchList");

  if (!list) return;


  const matches = await getMatches();

  allMatches = matches;


  if (!matches.length) {

    list.innerHTML = `
      <div class="empty-card">
        Belum ada hasil pertandingan.
      </div>
    `;

    return;

  }


  const latest = [...matches].reverse();


  list.innerHTML = latest.map(match => {

    return `
      <div class="match-card">

        <div>

          <div class="match-status">
            ● FINISHED
          </div>

          <div class="match-date">
            ${formatDate(match.created_at)}
          </div>

        </div>


        <div class="match-teams">

          <div class="match-team">
            ${escapeHTML(match.team1)}
          </div>

          <div class="match-score">
            ${Number(match.score1)}
            -
            ${Number(match.score2)}
          </div>

          <div class="match-team">
            ${escapeHTML(match.team2)}
          </div>

        </div>


        <div style="text-align:right;color:#8494aa;font-size:10px;">
          FT
        </div>

      </div>
    `;

  }).join("");

}


// =====================================================
// LOAD UPCOMING FIXTURES
// =====================================================

async function loadFixtures() {

  const list = document.getElementById("upcomingList");

  const fixtures = await getFixtures();

  allFixtures = fixtures;


  if (list) {

    if (!fixtures.length) {

      list.innerHTML = `
        <div class="empty-card">
          Belum ada jadwal pertandingan.
        </div>
      `;

    }

    else {

      list.innerHTML = fixtures.map(fixture => {

        return `
          <div class="match-card">

            <div>

              <div class="match-status upcoming">
                ⚡ UPCOMING
              </div>

              <div class="match-date">
                ${formatDate(fixture.scheduled_at)}
              </div>

            </div>


            <div class="match-teams">

              <div class="match-team">
                ${escapeHTML(fixture.team1)}
              </div>

              <div class="match-score">
                VS
              </div>

              <div class="match-team">
                ${escapeHTML(fixture.team2)}
              </div>

            </div>


            <div style="text-align:right;color:#8494aa;font-size:10px;">
              MD ${Number(fixture.matchday || 1)}
            </div>

          </div>
        `;

      }).join("");

    }

  }


  renderFixture();

  startFixtureRotation();

}


// =====================================================
// RENDER ROLLING FIXTURE
// =====================================================

function renderFixture() {

  const team1 = document.getElementById("fixtureTeam1");
  const team2 = document.getElementById("fixtureTeam2");
  const matchday = document.getElementById("fixtureMatchday");
  const date = document.getElementById("fixtureDate");
  const dots = document.getElementById("fixtureDots");


  if (!team1 || !team2) return;


  if (!allFixtures.length) {

    team1.textContent = "TEAM A";
    team2.textContent = "TEAM B";

    matchday.textContent = "MATCHDAY";

    date.textContent = "MENUNGGU JADWAL";

    if (dots) {

      dots.innerHTML = `
        <span class="active"></span>
      `;

    }

    return;

  }


  if (currentFixtureIndex >= allFixtures.length) {

    currentFixtureIndex = 0;

  }


  const fixture =
    allFixtures[currentFixtureIndex];


  team1.textContent =
    fixture.team1 || "TEAM A";

  team2.textContent =
    fixture.team2 || "TEAM B";


  matchday.textContent =
    `MATCHDAY ${fixture.matchday || 1}`;


  date.textContent =
    formatDate(fixture.scheduled_at);


  if (dots) {

    dots.innerHTML =
      allFixtures.map((_, index) => {

        return `
          <span
            class="${index === currentFixtureIndex ? "active" : ""}">
          </span>
        `;

      }).join("");

  }

}


// =====================================================
// NEXT FIXTURE
// =====================================================

function nextFixture() {

  if (!allFixtures.length) return;

  currentFixtureIndex++;

  if (currentFixtureIndex >= allFixtures.length) {
    currentFixtureIndex = 0;
  }

  renderFixture();

}


// =====================================================
// PREVIOUS FIXTURE
// =====================================================

function previousFixture() {

  if (!allFixtures.length) return;

  currentFixtureIndex--;

  if (currentFixtureIndex < 0) {
    currentFixtureIndex = allFixtures.length - 1;
  }

  renderFixture();

}


// =====================================================
// AUTO ROLLING
// =====================================================

function startFixtureRotation() {

  if (fixtureTimer) {

    clearInterval(fixtureTimer);

  }


  if (allFixtures.length <= 1) return;


  fixtureTimer = setInterval(() => {

    nextFixture();

  }, 5000);

}


// =====================================================
// ADD FIXTURE
// =====================================================

async function addFixture() {

  const team1 =
    document.getElementById("fixtureTeam1Input")
      ?.value.trim();

  const team2 =
    document.getElementById("fixtureTeam2Input")
      ?.value.trim();

  const matchday =
    Number(
      document.getElementById("fixtureMatchdayInput")
        ?.value || 1
    );

  const scheduledAt =
    document.getElementById("fixtureDateInput")
      ?.value;


  const message =
    document.getElementById("fixtureMessage");


  if (!team1 || !team2) {

    setMessage(
      message,
      "Nama kedua tim wajib diisi.",
      true
    );

    return;

  }


  if (team1.toLowerCase() === team2.toLowerCase()) {

    setMessage(
      message,
      "Tim tidak boleh sama.",
      true
    );

    return;

  }


  const {
    data: {
      user
    }
  } = await supabaseClient.auth.getUser();


  if (!user) {

    setMessage(
      message,
      "Silakan login sebagai admin.",
      true
    );

    return;

  }


  const { error } =
    await supabaseClient
      .from("fixtures")
      .insert({

        team1: team1,

        team2: team2,

        matchday: matchday,

        scheduled_at:
          scheduledAt
            ? new Date(scheduledAt).toISOString()
            : null,

        status: "UPCOMING"

      });


  if (error) {

    console.error(error);

    setMessage(
      message,
      "Gagal membuat jadwal: " + error.message,
      true
    );

    return;

  }


  setMessage(
    message,
    "✓ Jadwal berhasil dibuat."
  );


  document.getElementById(
    "fixtureTeam1Input"
  ).value = "";

  document.getElementById(
    "fixtureTeam2Input"
  ).value = "";


  document.getElementById(
    "fixtureDateInput"
  ).value = "";


  await loadFixtures();

}


// =====================================================
// ADD FINISHED MATCH
// =====================================================

async function addMatch() {

  const team1 =
    document.getElementById("team1")
      ?.value.trim();

  const team2 =
    document.getElementById("team2")
      ?.value.trim();

  const score1 =
    Number(
      document.getElementById("score1")
        ?.value
    );

  const score2 =
    Number(
      document.getElementById("score2")
        ?.value
    );


  const message =
    document.getElementById("adminMessage");


  if (!team1 || !team2) {

    setMessage(
      message,
      "Nama kedua tim wajib diisi.",
      true
    );

    return;

  }


  if (team1.toLowerCase() === team2.toLowerCase()) {

    setMessage(
      message,
      "Tim tidak boleh sama.",
      true
    );

    return;

  }


  if (
    Number.isNaN(score1) ||
    Number.isNaN(score2) ||
    score1 < 0 ||
    score2 < 0
  ) {

    setMessage(
      message,
      "Skor tidak valid.",
      true
    );

    return;

  }


  const {
    data: {
      user
    }
  } = await supabaseClient.auth.getUser();


  if (!user) {

    setMessage(
      message,
      "Silakan login sebagai admin.",
      true
    );

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

    setMessage(
      message,
      "Gagal menambahkan hasil: " + error.message,
      true
    );

    return;

  }


  setMessage(
    message,
    "✓ Hasil pertandingan berhasil ditambahkan."
  );


  document.getElementById("team1").value = "";
  document.getElementById("team2").value = "";

  document.getElementById("score1").value = 0;
  document.getElementById("score2").value = 0;


  await loadMatches();
  await loadLeagueTable();
  await updateStats();

}


// =====================================================
// ADMIN LOGIN
// =====================================================

async function loginAdmin() {

  const email =
    document.getElementById("loginEmail")
      ?.value.trim();

  const password =
    document.getElementById("loginPassword")
      ?.value;


  const message =
    document.getElementById("loginMessage");


  if (!email || !password) {

    setMessage(
      message,
      "Email dan password wajib diisi.",
      true
    );

    return;

  }


  const {
    data,
    error
  } =
    await supabaseClient.auth.signInWithPassword({

      email: email,

      password: password

    });


  if (error) {

    console.error(error);

    setMessage(
      message,
      "Login gagal: " + error.message,
      true
    );

    return;

  }


  setMessage(
    message,
    "✓ Login berhasil."
  );


  showAdminPanel();

}


// =====================================================
// LOGOUT
// =====================================================

async function logoutAdmin() {

  await supabaseClient.auth.signOut();

  showLoginBox();

}


// =====================================================
// SHOW ADMIN PANEL
// =====================================================

function showAdminPanel() {

  const loginBox =
    document.getElementById("loginBox");

  const adminPanel =
    document.getElementById("adminPanel");


  if (loginBox) {
    loginBox.classList.add("hidden");
  }

  if (adminPanel) {
    adminPanel.classList.remove("hidden");
  }

}


// =====================================================
// SHOW LOGIN
// =====================================================

function showLoginBox() {

  const loginBox =
    document.getElementById("loginBox");

  const adminPanel =
    document.getElementById("adminPanel");


  if (loginBox) {
    loginBox.classList.remove("hidden");
  }

  if (adminPanel) {
    adminPanel.classList.add("hidden");
  }

}


// =====================================================
// CHECK LOGIN
// =====================================================

async function checkLogin() {

  const {
    data: {
      session
    }
  } =
    await supabaseClient.auth.getSession();


  if (session) {

    showAdminPanel();

  }

  else {

    showLoginBox();

  }

}


// =====================================================
// STATS
// =====================================================

async function updateStats() {

  const matches =
    await getMatches();


  const fixtures =
    await getFixtures();


  const teams = new Set();


  matches.forEach(match => {

    teams.add(match.team1);
    teams.add(match.team2);

  });


  fixtures.forEach(fixture => {

    teams.add(fixture.team1);
    teams.add(fixture.team2);

  });


  const totalMatches =
    document.getElementById("totalMatches");

  const totalTeams =
    document.getElementById("totalTeams");


  if (totalMatches) {

    totalMatches.textContent =
      matches.length;

  }


  if (totalTeams) {

    totalTeams.textContent =
      teams.size;

  }

}


// =====================================================
// REALTIME MATCHES
// =====================================================

supabaseClient
  .channel("league-matches-live")

  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "matches"
    },
    async () => {

      await loadLeagueTable();

      await loadMatches();

      await updateStats();

    }
  )

  .subscribe();


// =====================================================
// REALTIME FIXTURES
// =====================================================

supabaseClient
  .channel("league-fixtures-live")

  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "fixtures"
    },
    async () => {

      currentFixtureIndex = 0;

      await loadFixtures();

      await updateStats();

    }
  )

  .subscribe();


// =====================================================
// AUTH STATE
// =====================================================

supabaseClient.auth.onAuthStateChange(
  (_event, session) => {

    if (session) {

      showAdminPanel();

    }

    else {

      showLoginBox();

    }

  }
);


// =====================================================
// HELPERS
// =====================================================

function formatDate(dateString) {

  if (!dateString) {
    return "WAKTU BELUM DITENTUKAN";
  }


  const date = new Date(dateString);


  if (Number.isNaN(date.getTime())) {
    return "WAKTU BELUM DITENTUKAN";
  }


  return date.toLocaleString(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour:
