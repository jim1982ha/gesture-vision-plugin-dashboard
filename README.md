#  dashboard

Provides an interactive UI overlay with widgets to control actions.

---

<p align="center">
  <img src="https://raw.githubusercontent.com/your-repo/gesture-vision-app/main/path/to/icon.png" width="80" alt="Dashboard Plugin Icon">
</p>
<h1 align="center">GestureVision - Dashboard Plugin</h1>
<p align="center">
  <strong>An interactive UI overlay with widgets to control your smart devices and actions directly from the video feed.</strong>
</p>

---

The Dashboard Plugin provides a highly interactive and visual way to trigger actions. When activated, it displays a customizable grid of widgets over the video feed. These widgets can be "clicked" using hand gestures (dwell-to-click with the index finger), providing immediate, hands-free control over your connected systems.

## ✨ Key Features

-   **Interactive Overlay:** Activates a grid-based dashboard directly on top of the live video feed.
-   **Gesture Control (Dwell-to-Click):** Use your index finger to hover over a widget; a radial progress bar will fill, triggering the widget's action upon completion.
-   **Customizable Layout:** Enter "Edit Mode" to add, remove, resize, and reconfigure widgets to create a personalized control panel.
-   **Dynamic Widget States:** Widgets for plugins like Home Assistant can reflect the real-time state of the device (e.g., showing a light as "on" or "off").
-   **Extensible:** The dashboard can host widgets that trigger actions from any other installed action plugin (Home Assistant, MQTT, Webhooks, etc.).

## 🔧 Configuration

The Dashboard plugin has no global configuration file. All setup is done through the user interface.

### How to Configure the Dashboard

1.  **Activate Dashboard Mode:** Click the Dashboard icon in the main application header.
2.  **Enter Edit Mode:** Once the dashboard is visible, click the "Edit Dashboard" button in the toolbar that appears.
3.  **Add a Widget:**
    -   Click the "Add Widget" button.
    -   In the **Widget Configuration** modal, give the widget an optional label.
    -   Select the **Widget Action** from the dropdown. This list is populated by all other action plugins you have installed (e.g., Home Assistant, MQTT).
    -   Configure the action-specific settings just as you would for a normal gesture.
    -   Select a widget size.
    -   Click **Save**.
4.  **Arrange and Resize:** In Edit Mode, you can drag widgets to new positions and use resize handles to change their size.
5.  **Save Layout:** Click "Save Layout" to exit Edit Mode and save your changes.

## 🚀 Usage Example

**Goal:** Create a dashboard button to toggle a living room fan in Home Assistant.

1.  Open the Dashboard and enter Edit Mode.
2.  Click **Add Widget**.
3.  Set the **Widget Label** to "Living Room Fan".
4.  For **Widget Action**, select "Home Assistant".
5.  Configure the action settings:
    -   **HA Domain:** `fan`
    -   **HA Entity:** `fan.living_room_fan`
    -   **HA Service:** `toggle`
6.  Click **Save**.
7.  Drag the new widget to your desired location and click **Save Layout**.
8.  Now, in Dashboard mode, simply point your index finger at the "Living Room Fan" widget and hold it there until the radial progress bar completes to toggle your fan.

---

Part of the **GestureVision** application.