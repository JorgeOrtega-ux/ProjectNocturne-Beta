<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>ProjectNocturne - Home</title>
    <meta name="description" content="Use ProjectNocturne to access useful tools like a world clock, custom alarms, timers, and stopwatches — all from your browser.">
    <meta name="keywords" content="online clock, online alarm, timer, stopwatch, tools, ProjectNocturne, web tools, online timer, free alarm, world clock">

    <link rel="icon" href="assets/img/favicon.ico" type="image/x-icon">

    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" />
    <link rel="stylesheet" type="text/css" href="assets/css/general/styles.css">
    <link rel="stylesheet" type="text/css" href="assets/css/general/dark-mode.css">
    <link rel="stylesheet" type="text/css" href="assets/css/tools/tools.css">
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.2/Sortable.min.js"></script>

    <script src="assets/js/app/initial-theme.js"></script>
</head>

<body>
    <div class="page-wrapper">
        <div class="main-content">
            <?php include 'includes/layouts/sidebar-desktop.php'; ?>
            <div class="general-content overflow-y">
                <div class="general-content-top">
                    <?php include 'includes/layouts/header.php'; ?>
                </div>
                <div class="general-content-scrolleable">
                    <?php include 'includes/layouts/sidebar-mobile.php'; ?>
                    <?php include 'includes/modules/module-overlays.php'; ?>
                    <div class="scrollable-content overflow-y">
                        <div class="section-content">
                            <?php include 'includes/sections/everything.php'; ?>
                            <?php include 'includes/sections/alarm.php'; ?>
                            <?php include 'includes/sections/timer.php'; ?>
                            <?php include 'includes/sections/stopwatch.php'; ?>
                            <?php include 'includes/sections/worldClock.php'; ?>

                            <?php include 'includes/sections/privacy-policy.php'; ?>
                            <?php include 'includes/sections/terms-conditions.php'; ?>
                            <?php include 'includes/sections/cookies-policy.php'; ?>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script type="module" src="assets/js/app/init-app.js"></script>
    <script type="module" src="assets/js/app/main.js"></script>
    <script type="module" src="assets/js/core/translations-controller.js"></script>
    <script type="module" src="assets/js/services/location-manager.js"></script>
    <script type="module" src="assets/js/core/module-manager.js"></script>
    <script type="module" src="assets/js/services/theme-manager.js"></script>
    <script type="module" src="assets/js/services/language-manager.js"></script>
    <script type="module" src="assets/js/ui/tooltip-controller.js"></script>
    <script type="module" src="assets/js/ui/drag-controller.js"></script>
    <script type="module" src="assets/js/ui/notification-controller.js"></script>
    <script type="module" src="assets/js/ui/menu-interactions.js"></script>
    <script type="module" src="assets/js/services/event-tracker.js"></script>
    <script type="module" src="assets/js/ui/palette-colors.js"></script>

    <script type="module" src="assets/js/features/general-tools.js"></script>
    <script type="module" src="assets/js/features/everything-controller.js"></script>
    <script type="module" src="assets/js/features/alarm-controller.js"></script>
    <script type="module" src="assets/js/features/timer-controller.js"></script>
    <script type="module" src="assets/js/features/stopwatch-controller.js"></script>
    <script type="module" src="assets/js/features/worldClock-controller.js"></script>
    <script type="module" src="assets/js/ui/ringing-controller.js"></script>

    <script type="module" src="assets/js/services/zoneinfo-controller.js"></script>

</body>

</html>