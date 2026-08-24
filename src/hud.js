export function createHUD(container) {
  container.innerHTML = `
    <div class="hud-horizon" id="hud-horizon">
      <div class="horizon-sky"></div>
      <div class="horizon-ground"></div>
      <div class="horizon-line" id="horizon-line"></div>
    </div>
    <div class="hud-left">
      <div class="hud-panel">
        <div class="label">Airspeed</div>
        <div class="value" id="hud-speed">0</div>
        <div class="label">KTS</div>
      </div>
      <div class="hud-panel">
        <div class="label">Altitude</div>
        <div class="value" id="hud-alt">0</div>
        <div class="label">FT AGL</div>
      </div>
      <div class="hud-panel">
        <div class="label">Wind</div>
        <div class="value" id="hud-wind">0</div>
        <div class="label" id="hud-wind-dir">000°</div>
      </div>
    </div>
    <div class="hud-right">
      <div class="hud-panel">
        <div class="label">Heading</div>
        <div class="value" id="hud-hdg">000</div>
      </div>
      <div class="hud-panel">
        <div class="label">Throttle</div>
        <div class="value" id="hud-throttle">0%</div>
      </div>
      <div class="hud-panel">
        <div class="label">Aircraft</div>
        <div class="value hud-aircraft" id="hud-aircraft">Prop</div>
      </div>
    </div>
    <div class="hud-top hud-panel">
      <div class="label">Score</div>
      <div class="value" id="hud-score">0</div>
    </div>
    <div class="hud-top hud-panel" style="top: 4.5rem;" id="hud-mission">FREE FLIGHT</div>
    <div class="hud-top hud-panel hud-ap" style="top: 7rem;" id="hud-status"></div>
  `;

  return {
    speed: container.querySelector("#hud-speed"),
    alt: container.querySelector("#hud-alt"),
    wind: container.querySelector("#hud-wind"),
    windDir: container.querySelector("#hud-wind-dir"),
    hdg: container.querySelector("#hud-hdg"),
    throttle: container.querySelector("#hud-throttle"),
    aircraft: container.querySelector("#hud-aircraft"),
    score: container.querySelector("#hud-score"),
    mission: container.querySelector("#hud-mission"),
    status: container.querySelector("#hud-status"),
    horizonLine: container.querySelector("#horizon-line"),
    horizon: container.querySelector("#hud-horizon"),
  };
}

export function updateHUD(hud, flight, groundY, score, stallSpeed, extras = {}) {
  const speed = flight.getAirspeed();
  const alt = flight.getAltitude(groundY);
  const hdg = flight.getHeading();

  hud.speed.textContent = Math.round(speed);
  hud.alt.textContent = Math.round(Math.max(0, alt));
  hud.hdg.textContent = String(Math.round(hdg)).padStart(3, "0");
  hud.throttle.textContent = `${Math.round(flight.throttle * 100)}%`;
  hud.score.textContent = score;
  hud.aircraft.textContent = flight.displayName?.split(" ")[0] ?? "Plane";

  if (extras.wind) {
    hud.wind.textContent = extras.wind.kts;
    hud.windDir.textContent = `${String(extras.wind.dir).padStart(3, "0")}°`;
  }

  if (extras.missionText) {
    hud.mission.textContent = extras.missionText;
    hud.mission.style.opacity = "1";
    hud.mission.classList.toggle("hud-ap-active", extras.autopilotOn);
  }

  const stallKts = stallSpeed * 1.94384;
  const showStall = stallSpeed > 0 && speed < stallKts && !flight.onGround;
  hud.speed.classList.toggle("hud-warning", showStall);
  hud.speed.classList.toggle("hud-danger", stallSpeed > 0 && speed < stallKts * 0.6 && !flight.onGround);

  if (extras.statusText) {
    hud.status.textContent = extras.statusText;
    hud.status.style.opacity = extras.statusText ? "1" : "0";
  } else if (flight.onGround) {
    hud.status.textContent = "ON GROUND";
    hud.status.style.opacity = "0.7";
  } else if (showStall) {
    hud.status.textContent = "STALL WARNING";
    hud.status.className = "hud-top hud-panel hud-ap hud-warning";
    hud.status.style.opacity = "1";
  } else {
    hud.status.textContent = "";
    hud.status.className = "hud-top hud-panel hud-ap";
    hud.status.style.opacity = "0";
  }

  const pitchDeg = (flight.euler.x * 180) / Math.PI;
  const rollDeg = (flight.euler.z * 180) / Math.PI;
  hud.horizon.style.transform = `translate(-50%, -50%) rotate(${rollDeg}deg)`;
  hud.horizonLine.style.transform = `translateY(${pitchDeg * 1.2}px) rotate(${-rollDeg}deg)`;
}
