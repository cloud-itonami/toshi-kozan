(ns cloud-itonami.toshi-kozan.state
  "App state for the toshi-kozan (etzhayyim-wasm-toshi-kozan-tk7x9p2m) appview UI.
  Ported 1:1 from the former appview/etzhayyim-wasm-toshi-kozan-tk7x9p2m/svelte/
  src/routes/+page.svelte template shell — a single static screen describing
  the app surface (title / project / routes / bindings / source path).
  Single reagent atom, murakumo-studio構成."
  (:require [reagent.core :as r]))

(defonce state
  (r/atom
   {:app {:title "Toshi Kozan Tk7x9p2m"
          :project "etzhayyim-project-toshi-kozan"
          :name "etzhayyim-wasm-toshi-kozan-tk7x9p2m"
          :kind "appview"
          :route-count 0
          :routes []
          :vars []
          :xrpc? true
          :relative-path "60-apps/etzhayyim-project-toshi-kozan/appview/etzhayyim-wasm-toshi-kozan-tk7x9p2m/svelte/src/routes/+page.svelte"}}))
