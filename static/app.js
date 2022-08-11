Vue.createApp({
  data() {
    return {
      airport: "",
      rows: [],
      didFetch: false,
      timer: null,
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
      const response = await fetch(`/data/${this.airport.toUpperCase()}`);
      const data = await response.json();
      while (this.rows.length > 0) {
        this.rows.pop();
      }
      data.forEach((row) => this.rows.push(row));
      this.didFetch = true;
      // TODO setInterval for refreshing data
    },
  },
}).mount("#app");
