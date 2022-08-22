const initialLocation =
  new URLSearchParams(window.location.search).get("l") ?? "";

document.addEventListener("alpine:init", () => {
  Alpine.data("app", () => ({
    airport: initialLocation,
    validAirport: true,
    error: false,
    timer: null,
    dataRows: [],

    updateAirport(event) {
      const value = event.currentTarget.value;
      if (value.length > 3) {
        if (event.code === "Enter") {
          this.fetchData(event);
        }
        event.preventDefault();
        return;
      }
    },

    async fetchData(event) {
      try {
        if (event !== null) {
          event.preventDefault();
        }
        const ap = this.airport.toUpperCase();
        const validResponse = await fetch(`/valid/${ap}`);
        if (validResponse.status === 404) {
          this.validAirport = false;
          return;
        }
        this.validAirport = true;
        const dataResponse = await fetch(`/data/${ap}`);
        if (dataResponse.status !== 200) {
          this.error = true;
          if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
          }
          console.error(
            `Got status ${
              dataResponse.status
            } from server: ${await dataResponse.text()}`
          );
          return;
        }
        this.error = false;
        const data = (await dataResponse.json()).map((row) => [
          row[0],
          row[1],
          Math.round(row[2]).toLocaleString(),
        ]);
        this.dataRows = data;
        this.timer = setTimeout(() => {
          this.fetchData(null);
        }, 15_000);
      } catch (err) {
        this.error = true;
        console.error(`An unknown error occurred: ${err}`);
      }
    },
  }));

  if (initialLocation !== "") {
    console.log(`Initializing airport to ${initialLocation}`);
    setTimeout(() => {
      document
        .querySelector("#airport-form")
        .dispatchEvent(new CustomEvent("airportpreload"));
    }, 500);
  }
});
