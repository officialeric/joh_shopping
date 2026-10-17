<?php

namespace App\Notifications;

use App\Models\ReturnRequest;
use App\Notifications\Concerns\Bilingual;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ReturnStatusChanged extends Notification implements ShouldQueue
{
    use Bilingual, Queueable;

    private const LABELS = [
        'requested' => ['imepokelewa', 'received'],
        'approved' => ['imeidhinishwa', 'approved'],
        'received' => ['bidhaa imepokelewa dukani', 'item received at our store'],
        'repaired' => ['imetengenezwa', 'repaired'],
        'refunded' => ['umerejeshewa pesa', 'refunded'],
        'rejected' => ['imekataliwa', 'rejected'],
        'completed' => ['imekamilika', 'completed'],
    ];

    public function __construct(public ReturnRequest $returnRequest)
    {
        $this->afterCommit();
    }

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return $this->customerChannels($notifiable);
    }

    public function toMail(object $notifiable): MailMessage
    {
        [$sw, $en] = self::LABELS[$this->returnRequest->status] ?? [$this->returnRequest->status, $this->returnRequest->status];

        return (new MailMessage)
            ->subject($this->pick("Ombi {$this->returnRequest->number}: {$sw}", "Request {$this->returnRequest->number}: {$en}"))
            ->line($this->pick(
                "Ombi lako la {$this->returnRequest->product_name} limesasishwa: {$sw}.",
                "Your request for {$this->returnRequest->product_name} was updated: {$en}."
            ))
            ->action($this->pick('Angalia ombi', 'View request'), $this->frontendUrl('/account/returns'));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        [$sw, $en] = self::LABELS[$this->returnRequest->status] ?? [$this->returnRequest->status, $this->returnRequest->status];

        return [
            'type' => 'order',
            'title' => ['sw' => "Ombi {$this->returnRequest->number}", 'en' => "Request {$this->returnRequest->number}"],
            'body' => ['sw' => "Hali mpya: {$sw}.", 'en' => "New status: {$en}."],
            'href' => '/account/returns',
        ];
    }
}
