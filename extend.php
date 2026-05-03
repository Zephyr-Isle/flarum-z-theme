<?php

use Flarum\Extend;
use Flarum\Extend\Theme;

return [
    (new Theme)
        ->addCSS(__DIR__.'/resources/less/forum.less'),
];