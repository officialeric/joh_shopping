<?php

namespace Tests\Feature;

use App\Listeners\EmbedMailLogo;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Notification as Notifications;
use Symfony\Component\Mime\Email;
use Tests\TestCase;

class MailBrandingTest extends TestCase
{
    public function test_emails_embed_the_logo_inline(): void
    {
        Notifications::route('mail', 'customer@example.com')->notifyNow(new class extends Notification
        {
            /** @return list<string> */
            public function via(object $notifiable): array
            {
                return ['mail'];
            }

            public function toMail(object $notifiable): MailMessage
            {
                return (new MailMessage)->subject('Hello')->line('Body')->action('Open', 'https://johshopping.com');
            }
        });

        /** @var Email $email */
        $email = app('mailer')->getSymfonyTransport()->messages()->last()->getOriginalMessage();

        $this->assertStringContainsString('cid:'.EmbedMailLogo::CID, $email->getHtmlBody());
        $this->assertCount(1, $email->getAttachments());
        $this->assertSame(EmbedMailLogo::CID, $email->getAttachments()[0]->getName());
    }
}
