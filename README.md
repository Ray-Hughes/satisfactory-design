# Satisfactory.Design

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/your-org/satisfactory.design/ci.yml?branch=main)](https://github.com/your-org/satisfactory.design/actions)
[![Coverage Status](https://img.shields.io/codecov/c/github/your-org/satisfactory.design/main)](https://codecov.io/gh/your-org/satisfactory.design)

**Satisfactory.Design** is a Ruby on Rails application that helps players design and plan their Satisfactory game factories with an interactive map, grid-based tools, foundation customization, and resource node placement.

---

## 🏗️ Features

- **Interactive World Map**: 2000×1500 SVG map with zoomable views.
- **Responsive Grid**: 50 m grid at world level, 4 m grid at detail level.
- **Area Selection**: Click-and-drag to highlight 4 m grid cells; toggle individual cells.
- **World Grid Toggle**: Snap selections to grid or freeform.
- **Foundation Customization**: Choose size (1 m, 2 m, 4 m) and material (concrete, metal, fiberglass).
- **Node & Building Placement**: Click resource nodes to add them to your layout.
- **Export & Save**: Persist project data in JSONB; export JSON for sharing.

---

## 🛠️ Tech Stack

- **Backend**: Ruby on Rails 7.x
- **Database**: PostgreSQL (JSONB for layouts)
- **Frontend**: ViewComponent, Stimulus (Hotwire)
- **Styling**: Tailwind CSS
- **Assets**: Propshaft

---

## 🚀 Installation

### Prerequisites

- Ruby 3.x
- Rails 7.x
- PostgreSQL
- Node.js & Yarn

### Setup

```bash
# Clone repository
git clone https://github.com/your-org/satisfactory.design.git
cd satisfactory.design

# Install dependencies
bundle install
yarn install

# Database setup
rails db:create db:migrate db:seed

# Start server
rails server
```

Open [http://localhost:3000](http://localhost:3000).

### Map Asset

Place your map image at:
```
app/assets/images/maps/satisfactory-map.png
```

---

## 🎮 Usage

1. **Create Project**: Click "New Factory Project".
2. **Select Area**: Toggle "World Grid" or freeform and drag to select area.
3. **Customize Foundation**: Choose foundation size & material.
4. **Zoom & Grid**: Click map to zoom; grid scales accordingly.
5. **Place Nodes**: Click resource nodes to add.
6. **Save & Export**: Use "Save" to persist; "Export JSON" to download layout.

---

## 📁 Project Structure

```
app/
  components/             # ViewComponents for UI
  controllers/            # Stimulus controllers
  views/                  # ERB templates
config/                  # Routes & initializers
db/                      # Migrations & seeds
public/assets/           # Compiled assets
```

---

## 🤝 Contributing

1. Fork this repo.
2. Create feature branch (`git checkout -b feature/foo`).
3. Commit changes (`git commit -m 'Add feature'`).
4. Push branch (`git push origin feature/foo`).
5. Open a pull request.

Please follow the code style and add tests for new features.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).