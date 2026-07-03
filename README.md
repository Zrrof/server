<p align="center">
    <a href="https://github.com/traggo/logo">
        <img height="300px" src="https://raw.githubusercontent.com/traggo/logo/master/logo.png" />
    </a>
</p>

<h1 align="center">traggo/server</h1>
<p align="center"><i>tag-based time tracking</i></p>

<p align="center">
    <a href="https://travis-ci.com/traggo/server">
        <img alt="Build Status" src="https://travis-ci.com/traggo/server.svg?branch=master">
    </a>
     <a href="https://codecov.io/gh/traggo/server">
        <img alt="codecov" src="https://codecov.io/gh/traggo/server/branch/master/graph/badge.svg">
    </a>
    <a href="https://goreportcard.com/report/github.com/traggo/server">
        <img alt="Go Report Card" src="https://goreportcard.com/badge/github.com/traggo/server">
    </a>
    <a href="https://hub.docker.com/r/traggo/server">
        <img alt="Docker Pulls" src="https://img.shields.io/docker/pulls/traggo/server.svg">
    </a>
    <a href="https://github.com/traggo/server/releases/latest">
        <img alt="latest release" src="https://img.shields.io/github/release/traggo/server.svg">
    </a>
</p>


Traggo is a tag-based time tracking tool. In Traggo there are no tasks, only [tagged](https://traggo.net/terminology/#tag) [time spans](https://traggo.net/terminology/#timespan).

With [tags](https://traggo.net/terminology/#tag), Traggo tries to be as customizable as possible, f.ex. if you work on different projects you could add a `project`-tag.
If you like to see statistics from the different things you do, you could add a `type`-tag with values like `email`, `programming`, `meeting`. 
You can do it just as you like.

If you want to use Traggo, you need to host it yourself. This way, you have the full control over your data and no third-party
may be able to read it. Have a look at our [Install Guide](https://traggo.net/install/).

## Features

* easy to setup
* time tracking (obviously)
* customizable dashboards with diagrams
* a list and calendar view of the tracked time
* sleek web ui with multiple themes
* simple user management

---

<a href="./.github/traggo_list.png">
    <img width="265" alt="traggo list" src=".github/traggo_list.png">
</a>
<a href=".github/traggo_calendar.png">
    <img width="265" alt="traggo list" src=".github/traggo_calendar.png">
</a>
<a href=".github/traggo_dashboard.png">
    <img width="265" alt="traggo list" src=".github/traggo_dashboard.png">
</a>

[Install](https://traggo.net/install/) ᛫
[Configuration](https://traggo.net/config/) ᛫
[Setup Dev Environment](https://traggo.net/dev/setup/)

## Versioning
We use [SemVer](http://semver.org/) for versioning. For the versions available, see the
[tags on this repository](https://github.com/traggo/server/tags).

## Reports

The UI includes a `/reports` page for reporting completed time spans. It reuses the existing time-span API and stores filters, sorting, column order and visibility, chart selection, collapsed groups, and page size in `localStorage`.

Reports supports:

- a table with date, start, end, duration, tags, and description columns
- client-side search across descriptions, tag keys and values, and dates
- period, tag, and duration filters
- sorting by date, start, end, duration, tags, or description
- grouping by day, ISO week, month, or year with totals and collapsible group rows
- summary cards for total hours, entry count, average per day, average per entry, longest entry, and shortest entry
- charts for hours per day, ISO week, month, or tag using Recharts
- pagination and persisted column visibility/order
- CSV export of the filtered data as UTF-8 semicolon-separated values
- XLSX export of the filtered data with `exceljs`, including a frozen header, autofilter, formatted date/duration columns, automatic column widths, and a summary row
- print/PDF mode that hides navigation and controls while showing the title, print date, active filters, summary, and table

## Raspberry Pi 5 with Portainer

The Portainer stack builds a native `linux/arm64` image directly on a Raspberry Pi 5 and stores the SQLite database in a named Docker volume.

Requirements:

- Raspberry Pi OS 64-bit or another 64-bit ARM Linux distribution
- Docker Engine with the Compose plugin
- Portainer connected to the Docker Standalone environment

Deploy the stack from Portainer:

1. Push the branch containing these files to GitHub.
2. In Portainer, select **Stacks**, **Add stack**, then **Git repository**.
3. Set the repository URL to `https://github.com/Zrrof/server.git`.
4. Select the branch containing the Reports module.
5. Set the Compose path to `docker-compose.portainer.yml`. The default `docker-compose.yml` is also configured for the same ARM64 production build.
6. Add the environment variable `TRAGGO_DEFAULT_USER_PASS` with a strong password.
7. Select **Deploy the stack**.

The first build can take several minutes on a Raspberry Pi. After deployment, open `http://<raspberry-pi-ip>:3030`. The application data remains in the `traggo-reporting-data` volume when the container is recreated.

If the Portainer build log contains `make download-tools install generate build-bin-local`, Portainer is using the development Dockerfile from an older repository revision. Pull the latest branch revision and redeploy the stack with either `docker-compose.portainer.yml` or the updated `docker-compose.yml`. Local development with the old development image is still available through `docker-compose.dev.yml`.
