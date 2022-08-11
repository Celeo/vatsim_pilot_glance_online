Vue.createApp({
  data() {
    return {
      airport: "",
      validAirport: true,
      error: false,
      timer: null,
      dataRows: [],
    };
  },
  methods: {
    updateAirport(event) {
      const value = event.currentTarget.value;
      if (value.length > 3) {
        if (event.code === "Enter") {
          this.fetchData();
        }
        event.preventDefault();
        return;
      }
    },
    async fetchData() {
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
      const data = await dataResponse.json();
      while (this.dataRows.length > 0) {
        this.dataRows.pop();
      }
      data.forEach((row) => this.dataRows.push(row));
      this.timer = setTimeout(() => {
        this.fetchData();
      }, 15_000);
    },
  },
  watch: {
    airport() {
      if (this.timer !== null) {
        clearTimeout(this.timer);
        this.timer = null;
      }
    },
  },
}).mount("#app");
