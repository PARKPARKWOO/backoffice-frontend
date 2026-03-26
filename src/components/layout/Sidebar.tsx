import { NavLink } from 'react-router-dom'

interface NavSection {
  title: string
  items: { label: string; path: string }[]
}

const sections: NavSection[] = [
  {
    title: '',
    items: [{ label: 'Dashboard', path: '/dashboard' }],
  },
  {
    title: 'Auth',
    items: [
      { label: 'Users', path: '/auth/users' },
      { label: 'Applications', path: '/auth/applications' },
      { label: 'Authorities', path: '/auth/authorities' },
    ],
  },
  {
    title: 'Spring AI',
    items: [
      { label: 'Clients', path: '/spring-ai/clients' },
      { label: 'API Keys', path: '/spring-ai/api-keys' },
      { label: 'Pricing Policies', path: '/spring-ai/pricing' },
    ],
  },
  {
    title: 'Services',
    items: [
      { label: 'Forest Supporters', path: '/forest/supporters' },
      { label: 'Barbellrobot', path: '/barbellrobot/members' },
      { label: 'Animal', path: '/animal/posts' },
      { label: 'Mirror View', path: '/mirror-view/quizzes' },
      { label: 'Storage', path: '/storage/files' },
    ],
  },
]

export default function Sidebar() {
  return (
    <aside className="w-60 min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      <div className="p-4 text-lg font-bold border-b border-gray-700">
        Backoffice
      </div>
      <nav className="flex-1 py-4">
        {sections.map((section) => (
          <div key={section.title || 'root'}>
            {section.title && (
              <p className="px-4 pt-4 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.title}
              </p>
            )}
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `block px-4 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
