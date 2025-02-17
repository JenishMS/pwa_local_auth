import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'pwa_local_auth';
  isAuthenticating = false;
  isSupported = true;
  credentialId: any;
  credential: any;
  result: any;
  deferredPrompt: any;
  showInstallButton = false;

  constructor() {
    this.isSupported = !!window.PublicKeyCredential;
  }

  ngOnInit(): void {
    const credentialIdStr = localStorage.getItem('credentialId');
    if (credentialIdStr) {
      this.credentialId = Uint8Array.from(atob(credentialIdStr), (c) =>
        c.charCodeAt(0)
      );
    }
  }

  async authenticate() {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    const userId = new Uint8Array(16);

    const options: PublicKeyCredentialCreationOptions = {
      challenge: challenge.buffer,
      rp: {
        name: 'PWA Local Authentication',
      },
      user: {
        id: userId,
        name: 'jeniabi645@gmail.com',
        displayName: 'Jenish MS',
      },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }], // ECDSA with SHA-256
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // For FaceID/Fingerprint
        userVerification: 'required',
      },
      timeout: 60000,
      attestation: 'direct',
    };

    const credential = (await navigator.credentials.create({
      publicKey: options,
    })) as PublicKeyCredential;

    if (credential) {
      this.credentialId = new Uint8Array(credential.rawId);
      localStorage.setItem(
        'credentialId',
        btoa(String.fromCharCode(...this.credentialId))
      );
    }

    console.log('Credential Created:', credential);
  }

  async verify() {
    if (!this.credentialId) {
      alert('User not registered!!!');
      return;
    }
    this.isAuthenticating = true;

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const options: PublicKeyCredentialRequestOptions = {
      challenge: challenge.buffer,
      allowCredentials: [
        {
          id: this.credentialId,
          type: 'public-key',
        },
      ],
      timeout: 60000,
      userVerification: 'required',
    };

    const assertion = (await navigator.credentials.get({
      publicKey: options,
    })) as PublicKeyCredential;
    if (assertion) {
      this.result = assertion;
    }
    this.isAuthenticating = false;
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(event: Event) {
    event.preventDefault();
    this.deferredPrompt = event;
    this.showInstallButton = true;
  }

  // Handle the click event to show the install prompt
  installPWA() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
      });
      this.deferredPrompt = null;
      this.showInstallButton = false;
    }
  }

  @HostListener('document:visibilitychange', ['$event'])
  onVisibilityChange() {
    if (!this.credentialId || document.hidden) return;
    this.verify();
  }
}
