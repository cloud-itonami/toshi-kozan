(ns cloud-itonami.toshi-kozan.ui
  "View tree for the toshi-kozan (etzhayyim-wasm-toshi-kozan-tk7x9p2m) appview.
  Ported 1:1 from the former svelte/src/routes/+page.svelte (template shell
  screen). Structural chrome comes from appkit.core / kotoba-ui.core
  (murakumo-studio構成); panels are hand-rolled hiccup styled with kotoba-ui's
  exposed class-name, mirroring cloud-itonami.shiharai.ui."
  (:require [appkit.core :as shape]
            [kotoba-ui.core :as ui]
            [cloud-itonami.toshi-kozan.state :as state]))

(def css-text
  "
.tk-app { min-height: 100vh; padding: 24px; background: var(--liquid-glass-bg, #11161d); color: var(--liquid-glass-fg, #eef4f8); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif; }
.tk-top { margin-bottom: 18px; }
.tk-top p, .tk-top span, .tk-muted, .tk-app h2, .tk-facts span { color: #96a6b8; }
.tk-top p { margin: 0 0 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
.tk-app h1, .tk-app h2, .tk-app p { margin: 0; }
.tk-app h1 { font-size: clamp(28px, 5vw, 48px); line-height: 1.05; }
.tk-top span { display: block; margin-top: 8px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; overflow-wrap: anywhere; }
.tk-facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 12px; }
.tk-facts > div, .tk-panel { border: 1px solid #2b3948; border-radius: 8px; background: #171f28; }
.tk-facts > div { padding: 14px; }
.tk-facts span { display: block; margin-bottom: 8px; font-size: 12px; }
.tk-facts strong { overflow-wrap: anywhere; }
.tk-panel { margin-bottom: 12px; padding: 16px; }
.tk-app h2 { margin-bottom: 12px; font-size: 13px; text-transform: uppercase; }
.tk-app ul { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.tk-app li, .tk-path p { border: 1px solid #263443; border-radius: 6px; background: #101720; padding: 9px 10px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; overflow-wrap: anywhere; }
.tk-chips { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
@media (max-width: 760px) { .tk-app { padding: 18px; } .tk-facts { grid-template-columns: 1fr; } }
")

(defn- panel [title body]
  [:section.tk-panel
   [:h2 title]
   body])

(defn- facts [app]
  [:section.tk-facts
   [:div [:span "Project"] [:strong (:project app)]]
   [:div [:span "Routes"] [:strong (:route-count app)]]
   [:div [:span "XRPC"] [:strong (if (:xrpc? app) "enabled" "not configured")]]])

(defn- public-routes [{:keys [routes]}]
  [panel "Public Routes"
   (if (seq routes)
     [:ul (for [r routes] ^{:key r} [:li r])]
     [:p.tk-muted "No public route is declared next to this app surface."])])

(defn- runtime-bindings [{:keys [vars]}]
  [panel "Runtime Bindings"
   (if (seq vars)
     [:ul.tk-chips (for [k vars] ^{:key k} [:li k])]
     [:p.tk-muted "No public vars are declared in the nearest wrangler config."])])

(defn- source [{:keys [relative-path]}]
  [:section.tk-panel.tk-path
   [:h2 "Source"]
   [:p relative-path]])

;; root

(defn root []
  (let [{:keys [app]} @state/state]
    [:div
     [:style css-text]
     [shape/panel
      [:main.tk-app
       [:section.tk-top
        [:p (str "Cloudflare " (:kind app))]
        [:h1 (:title app)]
        [:span (:name app)]]
       [facts app]
       [public-routes app]
       [runtime-bindings app]
       [source app]]]]))
