const SUPABASE_URL = "https://jrhgxphgvahlrodjtjzs.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_SuCUxQSZRQGr_GsS1TCy5Q_ItEUJB4d";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let teams = [];
let fixtures = [];
let matches = [];
let currentFixture = 0;


/* =========================
   PAGE NAVIGATION
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
  const { data, error } = await supabaseClient
    .from("teams")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Gagal mengambil teams:", error);
    return;
  }

  teams = data || [];

  renderTeamList();
  updateStats();

  /*
    Kalau belum ada jadwal sama sekali
    dan minimal ada 2 tim,
    jadwal bisa dibuat otomatis.
  */
  if (teams.length >= 2 && fixtures.length === 0) {
    await generateFixtures(true);
  }
}


function renderTeamList() {
  const container =
    document.getElementById("teamAdminList");

  if (!container) return;

  if (teams.length === 0) {
    container.innerHTML =
      "<p>Belum ada tim.</p>";
    return;
  }

  container.innerHTML = teams.map((team, index) => `
    <div class="admin-team-item">
      <span>
        ${index + 1}. ${escapeHTML(team.name)}
      </span>
    </div>
  `).join("");
}


async function addTeam() {
  const input =
    document.getElementById("teamNameInput");

  const message =
    document.getElementById("teamMessage");

  if (!input) return;

  const name = input.value.trim();

  if (!name) {
    if (message) {
      message.textContent =
        "Masukkan nama tim.";
    }
    return;
  }

  const exists = teams.some(
    team =>
      team.name.toLowerCase() === name.toLowerCase()
  );

  if (exists) {
    if (message) {
      message.textContent =
        "Tim tersebut sudah ada.";
    }
    return;
  }

  const { error } = await supabaseClient
    .from("teams")
    .insert({
      name: name
    });

  if (error) {
    console.error(error);

    if (message) {
      message.textContent =
        "Gagal menambahkan tim.";
    }

    return;
  }

  input.value = "";

  if (message) {
    message.textContent =
      "Tim berhasil ditambahkan.";
  }

  await loadTeams();
}


/* =========================
   AUTO FIXTURE GENERATOR
========================= */

async function generateFixtures(silent = false) {
  const message =
    document.getElementById("fixtureMessage");

  if (teams.length < 2) {
    if (!silent && message) {
      message.textContent =
        "Minimal harus ada 2 tim.";
    }

    return;
  }

  /*
    Jangan generate ulang kalau jadwal
    masih tersedia.
  */
  if (fixtures.length > 0) {
    if (!silent && message) {
      message.textContent =
        "Jadwal sudah tersedia.";
    }

    return;
  }

  let list = teams.map(team => team.name);

  /*
    Kalau jumlah tim ganjil,
    tambahkan BYE.
  */
  if (list.length % 2 !== 0) {
    list.push("BYE");
  }

  const totalTeams = list.length;
  const totalRounds = totalTeams - 1;
  const matchesPerRound = totalTeams / 2;

  const generated = [];

  for (
    let round = 0;
    round < totalRounds;
    round++
  ) {

    for (
      let i = 0;
      i < matchesPerRound;
      i++
    ) {

      const team1 = list[i];

      const team2 =
        list[totalTeams - 1 - i];

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

    /*
      Sistem round-robin:
      tim pertama tetap,
      sisanya berputar.
    */

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
    if (!silent && message) {
      message.textContent =
        "Gagal membuat jadwal.";
    }

    return;
  }

  const { error } =
    await supabaseClient
      .from("fixtures")
      .insert(generated);

  if (error) {
    console.error(
      "Gagal membuat fixtures:",
      error
    );

    if (!silent && message) {
      message.textContent =
        "Gagal menyimpan jadwal.";
    }

    return;
  }

  if (!silent && message) {
    message.textContent =
      `${generated.length} pertandingan berhasil dibuat.`;
  }

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
    console.error(
      "Gagal mengambil fixtures:",
      error
    );

    return;
  }

  fixtures = data || [];

  renderUpcoming();
  renderHomeFixture();
  renderAdminFixtureSelector();
  updateStats();
}


/*
  Hanya pertandingan UPCOMING
  yang dianggap sebagai jadwal aktif.
*/

function getUpcomingFixtures() {
  return fixtures.filter(
    fixture =>
      fixture.status === "UPCOMING"
  );
}


/* =========================
   HOME UPCOMING
========================= */

function renderUpcoming() {
  const container =
    document.getElementById("upcomingList");

  if (!container) return;

  const upcoming =
    getUpcomingFixtures();

  if (upcoming.length === 0) {
    container.innerHTML =
      "<p>Tidak ada pertandingan mendatang.</p>";

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
   HOME MAIN FIXTURE
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

  if (
    !team1 ||
    !team2 ||
    !matchday
  ) {
    return;
  }

  if (upcoming.length === 0) {

    team1.textContent = "-";
    team2.textContent = "-";

    matchday.textContent =
      "Tidak ada pertandingan";

    if (date) {
      date.textContent = "";
    }

    if (dots) {
      dots.innerHTML = "";
    }

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

  if (date) {
    if (fixture.scheduled_at) {
      date.textContent =
        formatDate(
          fixture.scheduled_at
        );
    } else {
      date.textContent =
        "Jadwal pertandingan";
    }
  }

  if (dots) {
    dots.innerHTML =
      upcoming.map((_, index) => `
        <span
          class="${index === currentFixture ? "active" : ""}">
        </span>
      `).join("");
  }
}


/* =========================
   HOME ARROWS
========================= */

const prevButton =
  document.getElementById(
    "prevFixture"
  );

const nextButton =
  document.getElementById(
    "nextFixture"
  );


if (prevButton) {
  prevButton.addEventListener(
    "click",
    () => {

      const upcoming =
        getUpcomingFixtures();

      if (upcoming.length === 0) {
        return;
      }

      currentFixture--;

      if (currentFixture < 0) {
        currentFixture =
          upcoming.length - 1;
      }

      renderHomeFixture();
    }
  );
}


if (nextButton) {
  nextButton.addEventListener(
    "click",
    () => {

      const upcoming =
        getUpcomingFixtures();

      if (upcoming.length === 0) {
        return;
      }

      currentFixture++;

      if (
        currentFixture >=
        upcoming.length
      ) {
        currentFixture = 0;
      }

      renderHomeFixture();
    }
  );
}


/*
  Otomatis berganti pertandingan
  setiap 5 detik.
*/

setInterval(() => {

  const upcoming =
    getUpcomingFixtures();

  if (upcoming.length <= 1) {
    return;
  }

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
   ADMIN MATCH SELECTOR
========================= */

/*
  Kita pakai select lama:
  #matchTeam1Select

  Jadi HTML lama tidak perlu
  dirombak.

  Select Team 2 akan disembunyikan.
*/

function renderAdminFixtureSelector() {

  const fixtureSelect =
    document.getElementById(
      "matchTeam1Select"
    );

  const team2Select =
    document.getElementById(
      "matchTeam2Select"
    );

  if (!fixtureSelect) {
    return;
  }

  const upcoming =
    getUpcomingFixtures();

  fixtureSelect.innerHTML =
    `<option value="">
      Pilih pertandingan
    </option>`;

  upcoming.forEach(fixture => {

    const option =
      document.createElement("option");

    option.value =
      fixture.id;

    option.textContent =
      `MD ${fixture.matchday} — ${fixture.team1} vs ${fixture.team2}`;

    fixtureSelect.appendChild(
      option
    );
  });

  /*
    Team 2 tidak diperlukan lagi.
  */

  if (team2Select) {
    team2Select.style.display =
      "none";

    team2Select.disabled = true;
  }

  fixtureSelect.dataset.mode =
    "fixture-selector";
}


/* =========================
   ADD MATCH RESULT
========================= */

async function addMatch() {

  const fixtureSelect =
    document.getElementById(
      "matchTeam1Select"
    );

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

  if (!fixtureSelect) {
    return;
  }

  const fixtureId =
    fixtureSelect.value;

  if (!fixtureId) {

    if (message) {
      message.textContent =
        "Pilih pertandingan.";
    }

    return;
  }

  if (
    score1Input.value === "" ||
    score2Input.value === ""
  ) {

    if (message) {
      message.textContent =
        "Masukkan skor.";
    }

    return;
  }

  const score1 =
    Number(score1Input.value);

  const score2 =
    Number(score2Input.value);

  if (
    !Number.isInteger(score1) ||
    !Number.isInteger(score2) ||
    score1 < 0 ||
    score2 < 0
  ) {

    if (message) {
      message.textContent =
        "Skor tidak valid.";
    }

    return;
  }


  /*
    Cari fixture yang dipilih.
  */

  const fixture =
    fixtures.find(
      item =>
        String(item.id) ===
        String(fixtureId)
    );

  if (!fixture) {

    if (message) {
      message.textContent =
        "Pertandingan tidak ditemukan.";
    }

    return;
  }


  if (
    fixture.status !== "UPCOMING"
  ) {

    if (message) {
      message.textContent =
        "Pertandingan sudah selesai.";
    }

    return;
  }


  /*
    Simpan hasil pertandingan.
  */

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

    console.error(
      "Gagal menyimpan hasil:",
      matchError
    );

    if (message) {
      message.textContent =
        "Gagal menyimpan hasil.";
    }

    return;
  }


  /*
    Tandai fixture sebagai PLAYED.
  */

  const { error: fixtureError } =
    await supabaseClient
      .from("fixtures")
      .update({
        status: "PLAYED"
      })
      .eq("id", fixture.id);

  if (fixtureError) {

    console.error(
      "Gagal mengubah fixture:",
      fixtureError
    );

    if (message) {
      message.textContent =
        "Hasil tersimpan, tetapi status jadwal gagal diperbarui.";
    }

    return;
  }


  /*
    Bersihkan form.
  */

  score1Input.value = "";
  score2Input.value = "";

  if (message) {
    message.textContent =
      "Pertandingan selesai. Hasil berhasil disimpan.";
  }

  currentFixture = 0;

  await loadMatches();
  await loadFixtures();
}


/* =========================
   MATCH RESULTS
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

    console.error(
      "Gagal mengambil matches:",
      error
    );

    return;
  }

  matches = data || [];

  renderMatches();
  calculateTable();
  updateStats();
}


function renderMatches() {

  const container =
    document.getElementById(
      "matchList"
    );

  if (!container) {
    return;
  }

  if (matches.length === 0) {

    container.innerHTML =
      "<p>Belum ada hasil pertandingan.</p>";

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

      } else if (
        match.score1 <
        match.score2
      ) {

        class1 = "loss";
        class2 = "win";

      } else {

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
              ${match.score1}
              -
              ${match.score2}
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
   LEAGUE TABLE
========================= */

function calculateTable() {

  const table = {};


  teams.forEach(team => {

    table[team.name] =
      createTeamStats(
        team.name
      );

  });


  matches.forEach(match => {

    if (!table[match.team1]) {
      table[match.team1] =
        createTeamStats(
          match.team1
        );
    }

    if (!table[match.team2]) {
      table[match.team2] =
        createTeamStats(
          match.team2
        );
    }


    const a =
      table[match.team1];

    const b =
      table[match.team2];


    a.mp++;
    b.mp++;


    a.gf +=
      Number(match.score1);

    a.ga +=
      Number(match.score2);


    b.gf +=
      Number(match.score2);

    b.ga +=
      Number(match.score1);


    if (
      Number(match.score1) >
      Number(match.score2)
    ) {

      a.w++;
      a.pts += 3;
      b.l++;

    } else if (
      Number(match.score1) <
      Number(match.score2)
    ) {

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

    team.gd =
      team.gf -
      team.ga;

  });


  const sorted =
    Object.values(table).sort(
      (a, b) => {

        if (
          b.pts !== a.pts
        ) {
          return b.pts - a.pts;
        }

        if (
          b.gd !== a.gd
        ) {
          return b.gd - a.gd;
        }

        return b.gf - a.gf;
      }
    );


  const tbody =
    document.getElementById(
      "leagueTable"
    );

  if (!tbody) {
    return;
  }


  tbody.innerHTML =
    sorted.map(
      (team, index) => `

        <tr>

          <td>
            ${index + 1}
          </td>

          <td>
            ${escapeHTML(team.team)}
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
            ${team.gd}
          </td>

          <td>
            <strong>
              ${team.pts}
            </strong>
          </td>

        </tr>

      `
    ).join("");
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
   ADMIN LOGIN
========================= */

async function checkLogin() {

  const {
    data: { session }
  } =
    await supabaseClient
      .auth
      .getSession();

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


  if (!loginBox || !adminPanel) {
    return;
  }


  if (session) {

    loginBox.style.display =
      "none";

    adminPanel.style.display =
      "block";

  } else {

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
    await supabaseClient
      .auth
      .signInWithPassword({
        email,
        password
      });


  if (error) {

    console.error(error);

    if (message) {
      message.textContent =
        "Login gagal.";
    }

    return;
  }


  if (message) {
    message.textContent =
      "Login berhasil.";
  }


  updateAdminUI(
    data.session
  );

  await loadTeams();
}


async function logout() {

  await supabaseClient
    .auth
    .signOut();

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
      getUpcomingFixtures().length;

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
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}


/* =========================
   BUTTON EVENTS
========================= */

const loginBtn =
  document.getElementById(
