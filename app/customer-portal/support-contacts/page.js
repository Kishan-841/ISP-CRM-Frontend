'use client';

import {
  Phone,
  Mail,
  User,
  Headset,
  ShieldCheck,
  UserCog,
  Crown,
  Settings,
  IndianRupee,
  BriefcaseBusiness,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

const escalationLevels = [
  {
    level: 1,
    title: 'Technical Helpdesk Executive',
    subtitle: '24 x 7 Support',
    color: 'blue',
    gradient: 'from-blue-500 to-blue-600',
    bgLight: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: Headset,
    contacts: [
      { name: '24x7 Support Line', phone: '02061930339', email: null },
    ],
  },
  {
    level: 2,
    title: 'Technical Support Lead',
    subtitle: '24 x 7 Support',
    color: 'emerald',
    gradient: 'from-emerald-500 to-emerald-600',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    icon: ShieldCheck,
    contacts: [
      { name: 'Vaibhav Bartakke', phone: '8956642489', email: 'vaibhav.bartakke@gazonindia.com' },
    ],
  },
  {
    level: 3,
    title: 'Service Assurance Manager',
    subtitle: '24 x 7 Support',
    color: 'amber',
    gradient: 'from-amber-500 to-amber-600',
    bgLight: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    icon: UserCog,
    contacts: [
      { name: 'Jayant Mali', phone: '7767817211', email: 'sam@gazonindia.com' },
      { name: 'Bharat Jadhav', phone: '7770015622', email: 'sm@gazonindia.com' },
      { name: 'Mangesh Fulbandhe', phone: '8956398902', email: 'e-sm@gazonindia.com' },
    ],
  },
  {
    level: 4,
    title: 'Head - Service Assurance Management',
    subtitle: 'Escalation Point',
    color: 'orange',
    gradient: 'from-orange-500 to-orange-600',
    bgLight: 'bg-orange-50 dark:bg-orange-900/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
    icon: Crown,
    contacts: [
      { name: 'Avinash Doijad', phone: '8956238065', email: 'avinash.doijad@gazonindia.com' },
    ],
  },
  {
    level: 5,
    title: 'GM - Operations & Maintenance',
    subtitle: 'Final Escalation',
    color: 'rose',
    gradient: 'from-rose-500 to-rose-600',
    bgLight: 'bg-rose-50 dark:bg-rose-950/30',
    borderColor: 'border-rose-200 dark:border-rose-800',
    icon: Settings,
    contacts: [
      { name: 'Sanith Bilaware', phone: '9588499959', email: 'sanith@gazonindia.com' },
    ],
  },
];

const billingContacts = [
  {
    title: 'Billing',
    icon: IndianRupee,
    name: 'Pramod Pedamakar',
    email: 'crm@gazonindia.com',
    phone: '7030938375',
  },
  {
    title: 'Accounts Head',
    icon: BriefcaseBusiness,
    name: 'Onkar Lomate',
    email: 'onkarlomate@gazonindia.com',
    phone: '9172209743',
  },
];

function ContactCard({ contact }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
        <User size={16} className="text-slate-500 dark:text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{contact.name}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-0.5">
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <Phone size={11} />
              {contact.phone}
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <Mail size={11} />
              {contact.email}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SupportContactsPage() {
  return (
    <div className="space-y-8">
      {/* Page Title */}
      <PageHeader title="Support Contacts" description="Escalation matrix and billing contacts for quick resolution" />

      {/* Escalation Matrix */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Escalation Matrix</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          If your issue is not resolved at one level, escalate to the next level for faster resolution.
        </p>

        <div className="space-y-4">
          {escalationLevels.map((level, idx) => {
            const Icon = level.icon;
            return (
              <div key={level.level} className="relative">
                {/* Connector line */}
                {idx < escalationLevels.length - 1 && (
                  <div className="absolute left-7 top-full w-0.5 h-4 bg-slate-200 dark:bg-slate-700 z-0" />
                )}

                <div className={`rounded-2xl bg-white dark:bg-slate-900 border ${level.borderColor} overflow-hidden shadow-sm`}>
                  {/* Level Header */}
                  <div className={`bg-gradient-to-r ${level.gradient} px-5 py-3 flex items-center gap-3`}>
                    <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                      <Icon size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Level {level.level}</span>
                        <span className="text-white/50 text-[10px]">&bull;</span>
                        <span className="text-white/70 text-[10px] font-medium uppercase tracking-wider">{level.subtitle}</span>
                      </div>
                      <h3 className="text-sm font-bold text-white mt-0.5 truncate">{level.title}</h3>
                    </div>
                  </div>

                  {/* Contacts */}
                  <div className="px-5 py-3 divide-y divide-slate-100 dark:divide-slate-800">
                    {level.contacts.map((contact, cIdx) => (
                      <ContactCard key={cIdx} contact={contact} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Billing & Accounts Contacts */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Billing & Accounts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {billingContacts.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800 px-5 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <Icon size={18} className="text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-white">{item.title}</h3>
                </div>
                <div className="px-5 py-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.name}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                    <a href={`tel:${item.phone}`} className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      <Phone size={12} />
                      {item.phone}
                    </a>
                    <a href={`mailto:${item.email}`} className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      <Mail size={12} />
                      {item.email}
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
