permissions := "--allow-read=./ --allow-net=0.0.0.0:8000,status.vatsim.net,data.vatsim.net,api.vatsim.net"
runfile := "main.ts"

run:
  @deno run {{permissions}} {{runfile}} -d

run-no-debug:
  @deno run {{permissions}} {{runfile}}

debug:
  @deno run --inspect-brk=0.0.0.0:9229 {{permissions}} {{runfile}}

compile:
  @deno compile {{permissions}} {{runfile}}
