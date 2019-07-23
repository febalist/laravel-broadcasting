<?php

namespace Febalist\Laravel\Broadcasting;

use Illuminate\Support\ServiceProvider;

class BroadcastingServiceProvider extends ServiceProvider
{
    public function boot()
    {
        $connection = config('broadcasting.default');
        $driver = config("broadcasting.connections.$connection.driver");

        if ($driver == 'pusher') {
            javascript('broadcasting', [
                'driver' => $driver,
                'key' => config("broadcasting.connections.$connection.key"),
                'cluster' => config("broadcasting.connections.$connection.options.cluster"),
                'encrypted' => config("broadcasting.connections.$connection.options.useTLS"),
            ]);
        } elseif ($driver == 'redis') {
            javascript('broadcasting', [
                'driver' => $driver,
            ]);
        }
    }
}
