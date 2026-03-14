/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Willkommen bei Lernzeit – bitte bestätige deine E-Mail-Adresse 🎓</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={logo}>🎓 Lernzeit</Text>
        </Section>
        <Heading style={h1}>Willkommen bei Lernzeit! 🎉</Heading>
        <Text style={text}>
          Schön, dass du dabei bist! Wir freuen uns, dich und deine Familie auf der Lernreise zu begleiten.
        </Text>
        <Text style={text}>
          Bitte bestätige deine E-Mail-Adresse ({recipient}), damit es losgehen kann:
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            E-Mail bestätigen ✓
          </Button>
        </Section>
        <Text style={hint}>
          Der Link ist 24 Stunden gültig. Danach kannst du einen neuen anfordern.
        </Text>
        <Text style={footer}>
          Falls du kein Konto erstellt hast, kannst du diese E-Mail einfach ignorieren.
        </Text>
        <Text style={footerBrand}>
          © Lernzeit – Gemeinsam schlauer werden 💪
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = {
  backgroundColor: '#f8f9ff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}
const container = { maxWidth: '480px', margin: '0 auto', padding: '40px 24px' }
const header = { textAlign: 'center' as const, marginBottom: '24px' }
const logo = { fontSize: '28px', fontWeight: 'bold' as const, color: 'hsl(217, 91%, 60%)', margin: '0' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(240, 10%, 15%)', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '15px', color: 'hsl(240, 5%, 35%)', lineHeight: '1.6', margin: '0 0 16px' }
const buttonSection = { textAlign: 'center' as const, margin: '24px 0' }
const button = { backgroundColor: 'hsl(217, 91%, 60%)', color: '#ffffff', fontSize: '16px', fontWeight: 'bold' as const, borderRadius: '8px', padding: '14px 28px', textDecoration: 'none' }
const hint = { fontSize: '13px', color: 'hsl(240, 5%, 55%)', lineHeight: '1.5', margin: '0 0 24px', textAlign: 'center' as const }
const footer = { fontSize: '12px', color: 'hsl(240, 5%, 60%)', margin: '24px 0 8px', borderTop: '1px solid hsl(240, 20%, 92%)', paddingTop: '16px' }
const footerBrand = { fontSize: '12px', color: 'hsl(217, 91%, 60%)', margin: '0', fontWeight: '500' as const }
