<?php

use Flarum\Extend;
use Flarum\Extend\Frontend;

return [
    (new Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/resources/less/forum.less'),
];
