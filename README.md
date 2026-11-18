# Activity visibility across windows

Two windows of an isolated Paradev dev instance opened the same fixture workspace at localhost:3025. Each showed the docked activity panel with a 340 px inset. CDP mouse input clicked the activity button in the first window, then captured the second window.

Before, the second window still showed the panel after the saved preference had changed. After, it hid the panel without reloading the second window during the interaction. The baseline run used the dashboard layout from a8f492d4131f1e8e3ee137534e0626af97d4e9ee. The after run loaded the reviewed layout in both windows before the click.

Source: `09dd296fcbcadfd08ed7464f9512eca14ddafe6e`.

These are clipped CDP screenshots and measurements from the actual dev renderer. The separate quota regression uses a synthetic storage failure and verifies the real reclaim action and the latest saved value.
