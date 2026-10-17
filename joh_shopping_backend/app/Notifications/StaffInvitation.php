<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Invites a new staff member to set their password.
 */
class StaffInvitation extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $token) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = rtrim((string) config('app.frontend_url'), '/').'/sw/admin/accept-invite?'.http_build_query([
            'token' => $this->token,
            'email' => $notifiable->email,
        ]);

        return (new MailMessage)
            ->subject('Umealikwa kwenye Joh Shopping Admin / You are invited to Joh Shopping Admin')
            ->line('Weka nenosiri lako ili kuanza. / Set your password to get started.')
            ->action('Kubali mwaliko / Accept invitation', $url)
            ->line('Kiungo hiki kinaisha baada ya siku 7. / This link expires in 7 days.');
    }
}
